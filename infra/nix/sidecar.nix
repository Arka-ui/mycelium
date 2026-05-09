{ pkgs, lib, rustPlatform }:
{ name, src }:
rustPlatform.buildRustPackage {
  pname = name;
  version = "0.1.0";
  inherit src;
  cargoLock.lockFile = src + "/Cargo.lock";
  nativeBuildInputs = with pkgs; [ pkg-config clang ];
  buildInputs = with pkgs; [ openssl ];
  cargoBuildFlags = [ "-p" name ];
  doCheck = false;
  LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
}
