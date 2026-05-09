(module
  (func $square (export "square") (param $x i32) (result i32)
    local.get $x
    local.get $x
    i32.mul
  )
  (func $add_one (export "add_one") (param $x i32) (result i32)
    local.get $x
    i32.const 1
    i32.add
  )
)
