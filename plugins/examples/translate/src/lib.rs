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
pub extern "C" fn translate_to_pseudo_es(input_ptr: i32, input_len: i32) -> i64 {
    let input = unsafe {
        std::slice::from_raw_parts(input_ptr as *const u8, input_len as usize)
    };
    let text = std::str::from_utf8(input).unwrap_or("");
    let translated = pseudo_translate(text);
    let bytes = translated.into_bytes();
    let len = bytes.len();
    let boxed = bytes.into_boxed_slice();
    let ptr = Box::into_raw(boxed) as *const u8;
    pack(ptr, len)
}

#[no_mangle]
pub extern "C" fn upper(input_ptr: i32, input_len: i32) -> i64 {
    let input = unsafe {
        std::slice::from_raw_parts(input_ptr as *const u8, input_len as usize)
    };
    let text = std::str::from_utf8(input).unwrap_or("");
    let upper = text.to_uppercase();
    let bytes = upper.into_bytes();
    let len = bytes.len();
    let boxed = bytes.into_boxed_slice();
    let ptr = Box::into_raw(boxed) as *const u8;
    pack(ptr, len)
}

fn pseudo_translate(text: &str) -> String {
    let pairs: &[(&str, &str)] = &[
        ("the ", "el "), ("The ", "El "),
        ("hello", "hola"), ("Hello", "Hola"),
        ("world", "mundo"), ("World", "Mundo"),
        ("good", "bueno"), ("Good", "Bueno"),
        ("morning", "mañana"), ("Morning", "Mañana"),
        ("night", "noche"), ("Night", "Noche"),
        ("love", "amor"), ("Love", "Amor"),
        ("friend", "amigo"), ("Friend", "Amigo"),
        ("family", "familia"), ("Family", "Familia"),
        ("water", "agua"), ("Water", "Agua"),
        ("food", "comida"), ("Food", "Comida"),
        ("book", "libro"), ("Book", "Libro"),
        ("house", "casa"), ("House", "Casa"),
        ("yes", "sí"), ("Yes", "Sí"),
        ("no", "no"), ("No", "No"),
        ("please", "por favor"), ("Please", "Por favor"),
        ("thank you", "gracias"), ("Thank you", "Gracias"),
    ];
    let mut out = text.to_string();
    for (en, es) in pairs {
        out = out.replace(en, es);
    }
    out
}
