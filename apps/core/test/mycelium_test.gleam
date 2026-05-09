//// Smoke tests for the BEAM core.
////
//// M0: just enough to verify the modules load and pure helpers (ULID,
//// block JSON round-trip) are correct. The real test surface lives in
//// `tests/property/` and `tests/integration/` for M1+.

import gleam/string
import gleeunit
import gleeunit/should

import mycelium/document/block
import mycelium/util/ulid

pub fn main() -> Nil {
  gleeunit.main()
}

pub fn ulid_length_test() -> Nil {
  let id = ulid.new()
  should.equal(string.length(id), 26)
}

pub fn ulid_uniqueness_test() -> Nil {
  let a = ulid.new()
  let b = ulid.new()
  should.not_equal(a, b)
}

pub fn block_paragraph_json_roundtrip_test() -> Nil {
  let p = block.Paragraph(id: "01HXAB000000000000000000XX", text: "hello")
  let json_str = p |> block.to_json
  // Spot-check: the encoded form mentions the kind.
  should.equal(string.contains(string.inspect(json_str), "paragraph"), True)
}
