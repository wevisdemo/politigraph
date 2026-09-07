{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSystem =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f (
            import nixpkgs {
              inherit system;
              config.allowUnfree = true;
            }
          )
        );
    in
    {
      devShells = forEachSystem (
        pkgs:
        let
          libs = with pkgs; [
            glib
            nss
            nspr
            at-spi2-atk
            cups
            libdrm
            gtk3
            pango
            cairo
            mesa
            expat
            libxkbcommon
            alsa-lib
            dbus
            libgbm
            libx11
            libxcomposite
            libxdamage
            libxext
            libxfixes
            libxrandr
            libxcb
          ];
        in
        {
          default = pkgs.mkShell {
            nativeBuildInputs =
              with pkgs;
              [
                bun
                playwright-driver.browsers
                rsync
                openssh
                k6
              ]
              ++ libs;

            shellHook = ''
              export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
              export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
              export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="ubuntu-24.04"
              export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath libs}:$LD_LIBRARY_PATH"
            '';
          };
        }
      );
    };
}
