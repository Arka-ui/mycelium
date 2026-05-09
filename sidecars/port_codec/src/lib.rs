use anyhow::{anyhow, Context, Result};
use serde::{de::DeserializeOwned, Serialize};
use tokio::io::{AsyncReadExt, AsyncWrite, AsyncWriteExt};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Encoding {
    Json,
    Cbor,
}

impl Encoding {
    pub fn from_env() -> Self {
        match std::env::var("MYCELIUM_PORT_ENCODING").ok().as_deref() {
            Some("cbor") => Encoding::Cbor,
            _ => Encoding::Json,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Encoding::Json => "json",
            Encoding::Cbor => "cbor",
        }
    }
}

pub fn encode<T: Serialize>(enc: Encoding, value: &T) -> Result<Vec<u8>> {
    match enc {
        Encoding::Json => {
            let mut bytes = serde_json::to_vec(value).context("json encode")?;
            bytes.push(b'\n');
            Ok(bytes)
        }
        Encoding::Cbor => {
            let mut buf = Vec::new();
            ciborium::ser::into_writer(value, &mut buf).map_err(|e| anyhow!("cbor encode: {e}"))?;
            let len = u32::try_from(buf.len()).context("frame > 4 GiB")?;
            let mut out = Vec::with_capacity(4 + buf.len());
            out.extend_from_slice(&len.to_be_bytes());
            out.extend_from_slice(&buf);
            Ok(out)
        }
    }
}

pub async fn write_frame<T: Serialize, W: AsyncWrite + Unpin>(
    enc: Encoding,
    writer: &mut W,
    value: &T,
) -> Result<()> {
    let bytes = encode(enc, value)?;
    writer.write_all(&bytes).await.context("write frame")?;
    writer.flush().await.context("flush")?;
    Ok(())
}

pub async fn read_frame<T: DeserializeOwned, R: tokio::io::AsyncRead + Unpin>(
    enc: Encoding,
    reader: &mut R,
    line_buf: &mut String,
) -> Result<Option<T>> {
    match enc {
        Encoding::Json => {
            line_buf.clear();
            let mut byte = [0u8; 1];
            loop {
                match reader.read_exact(&mut byte).await {
                    Ok(_) => {
                        if byte[0] == b'\n' {
                            if line_buf.trim().is_empty() {
                                continue;
                            }
                            let parsed: T =
                                serde_json::from_str(line_buf.trim()).context("json decode")?;
                            return Ok(Some(parsed));
                        }
                        line_buf.push(byte[0] as char);
                        if line_buf.len() > 16 * 1024 * 1024 {
                            return Err(anyhow!("frame > 16 MiB"));
                        }
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
                    Err(e) => return Err(anyhow!("read: {e}")),
                }
            }
        }
        Encoding::Cbor => {
            let mut len_buf = [0u8; 4];
            match reader.read_exact(&mut len_buf).await {
                Ok(_) => {}
                Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
                Err(e) => return Err(anyhow!("read len: {e}")),
            }
            let len = u32::from_be_bytes(len_buf) as usize;
            if len > 16 * 1024 * 1024 {
                return Err(anyhow!("frame > 16 MiB"));
            }
            let mut payload = vec![0u8; len];
            reader
                .read_exact(&mut payload)
                .await
                .context("read payload")?;
            let parsed: T = ciborium::de::from_reader(payload.as_slice())
                .map_err(|e| anyhow!("cbor decode: {e}"))?;
            Ok(Some(parsed))
        }
    }
}
