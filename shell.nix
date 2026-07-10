{
  pkgs ? import <nixpkgs> { config.allowUnfree = true; },
}:
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
pkgs.mkShell {
  nativeBuildInputs =
    with pkgs;
    [
      bun
      playwright-driver.browsers
    ]
    ++ libs;

  shellHook = ''
    export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
    export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
    export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="ubuntu-24.04"
    export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath libs}:$LD_LIBRARY_PATH"
  '';
}
