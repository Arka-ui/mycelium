use std::alloc::Layout;

#[no_mangle]
pub extern "C" fn alloc(size: i32) -> i32 {
    let layout = Layout::from_size_align(size as usize, 1).unwrap();
    unsafe { std::alloc::alloc(layout) as i32 }
}

fn pack(ptr: *const u8, len: usize) -> i64 {
    ((ptr as i64) << 32) | (len as i64 & 0xFFFF_FFFF)
}

#[no_mangle]
pub extern "C" fn parse_ics(input_ptr: i32, input_len: i32) -> i64 {
    let input = unsafe {
        std::slice::from_raw_parts(input_ptr as *const u8, input_len as usize)
    };
    let text = std::str::from_utf8(input).unwrap_or("");
    let json = parse_ics_to_json(text);
    let bytes = json.into_bytes();
    let len = bytes.len();
    let boxed = bytes.into_boxed_slice();
    let ptr = Box::into_raw(boxed) as *const u8;
    pack(ptr, len)
}

fn parse_ics_to_json(content: &str) -> String {
    let mut events: Vec<Event> = Vec::new();
    let mut current: Option<Event> = None;
    for raw_line in content.lines() {
        let line = raw_line.trim_end_matches('\r');
        if line == "BEGIN:VEVENT" {
            current = Some(Event::default());
        } else if line == "END:VEVENT" {
            if let Some(ev) = current.take() {
                events.push(ev);
            }
        } else if let Some(ev) = current.as_mut() {
            if let Some(rest) = line.strip_prefix("SUMMARY:") {
                ev.summary = unescape(rest);
            } else if let Some(rest) = line.strip_prefix("DESCRIPTION:") {
                ev.description = unescape(rest);
            } else if let Some(rest) = line.strip_prefix("DTSTART:") {
                ev.dtstart = rest.to_string();
            } else if let Some(rest) = line.strip_prefix("DTEND:") {
                ev.dtend = rest.to_string();
            } else if let Some(rest) = line.strip_prefix("UID:") {
                ev.uid = rest.to_string();
            } else if let Some(rest) = line.strip_prefix("LOCATION:") {
                ev.location = unescape(rest);
            }
        }
    }
    serialize_events(&events)
}

#[derive(Default)]
struct Event {
    uid: String,
    summary: String,
    description: String,
    location: String,
    dtstart: String,
    dtend: String,
}

fn unescape(s: &str) -> String {
    s.replace("\\n", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")
}

fn json_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn serialize_events(events: &[Event]) -> String {
    let mut out = String::from("{\"events\":[");
    for (i, ev) in events.iter().enumerate() {
        if i > 0 { out.push(','); }
        out.push_str("{\"uid\":\"");
        out.push_str(&json_escape(&ev.uid));
        out.push_str("\",\"summary\":\"");
        out.push_str(&json_escape(&ev.summary));
        out.push_str("\",\"description\":\"");
        out.push_str(&json_escape(&ev.description));
        out.push_str("\",\"location\":\"");
        out.push_str(&json_escape(&ev.location));
        out.push_str("\",\"dtstart\":\"");
        out.push_str(&json_escape(&ev.dtstart));
        out.push_str("\",\"dtend\":\"");
        out.push_str(&json_escape(&ev.dtend));
        out.push_str("\"}");
    }
    out.push_str("],\"count\":");
    out.push_str(&events.len().to_string());
    out.push('}');
    out
}
