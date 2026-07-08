# shellcheck disable=SC2034
SKIPUNZIP=1

SONAME="Oh My Keymint"
SUPPORTED_ABIS="arm64 x64"
MIN_SDK=29

if [ "$BOOTMODE" ] && [ "$KSU" ]; then
  ui_print "- Installing from KernelSU app"
  ui_print "- KernelSU version: $KSU_KERNEL_VER_CODE (kernel) + $KSU_VER_CODE (ksud)"
  if [ "$(which magisk)" ]; then
    ui_print "*********************************************************"
    ui_print "! Multiple root implementation is NOT supported!"
    ui_print "! Please uninstall Magisk before installing Oh My Keymint"
    abort    "*********************************************************"
  fi
elif [ "$BOOTMODE" ] && [ "$MAGISK_VER_CODE" ]; then
  ui_print "- Installing from Magisk app"
else
  ui_print "*********************************************************"
  ui_print "! Install from recovery is not supported"
  ui_print "! Please install from KernelSU or Magisk app"
  abort    "*********************************************************"
fi

VERSION=$(grep_prop version "${TMPDIR}/module.prop")
ui_print "- Installing $SONAME $VERSION"

# check architecture
support=false
for abi in $SUPPORTED_ABIS
do
  if [ "$ARCH" == "$abi" ]; then
    support=true
  fi
done
if [ "$support" == "false" ]; then
  abort "! Unsupported platform: $ARCH"
else
  ui_print "- Device platform: $ARCH"
fi

# check android
if [ "$API" -lt $MIN_SDK ]; then
  ui_print "! Unsupported sdk: $API"
  abort "! Minimal supported sdk is $MIN_SDK"
else
  ui_print "- Device sdk: $API"
fi

ui_print "- Extracting verify.sh"
unzip -o "$ZIPFILE" 'verify.sh' -d "$TMPDIR" >&2
if [ ! -f "$TMPDIR/verify.sh" ]; then
  ui_print "*********************************************************"
  ui_print "! Unable to extract verify.sh!"
  ui_print "! This zip may be corrupted, please try downloading again"
  abort    "*********************************************************"
fi
. "$TMPDIR/verify.sh"
extract "$ZIPFILE" 'customize.sh'  "$TMPDIR/.vunzip"
extract "$ZIPFILE" 'verify.sh'     "$TMPDIR/.vunzip"

ui_print "- Extracting module files"
extract "$ZIPFILE" 'module.prop'     "$MODPATH"
extract "$ZIPFILE" 'post-fs-data.sh' "$MODPATH"
extract "$ZIPFILE" 'service.sh'      "$MODPATH"
extract "$ZIPFILE" 'sepolicy.rule'   "$MODPATH"
extract "$ZIPFILE" 'daemon'          "$MODPATH"
extract "$ZIPFILE" 'daemon-injector' "$MODPATH"
extract "$ZIPFILE" 'injector.toml'   "$MODPATH"
extract "$ZIPFILE" 'keybox.xml'      "$MODPATH"
chmod 755 "$MODPATH/daemon" "$MODPATH/daemon-injector" \
  "$MODPATH/post-fs-data.sh" "$MODPATH/service.sh"


if [ "$ARCH" = "x64" ] || [ "$ARCH" = "x86_64" ]; then
  ui_print "- Using packaged x64 binaries"
  BINDIR="$MODPATH/libs/x86_64"
  extract "$ZIPFILE" 'libs/x86_64/keymint' "$MODPATH"
  extract "$ZIPFILE" 'libs/x86_64/inject'  "$MODPATH"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "arm64-v8a" ]; then
  ui_print "- Using packaged arm64 binaries"
  BINDIR="$MODPATH/libs/arm64-v8a"
  extract "$ZIPFILE" 'libs/arm64-v8a/keymint' "$MODPATH"
  extract "$ZIPFILE" 'libs/arm64-v8a/inject'  "$MODPATH"
else
  abort "! Unsupported platform: $ARCH"
fi

[ -f "$BINDIR/keymint" ] || abort "! Missing $BINDIR/keymint"
[ -f "$BINDIR/inject" ] || abort "! Missing $BINDIR/inject"
chmod 755 "$BINDIR/keymint" "$BINDIR/inject"

ui_print "- Extracting webroot"
unzip -o "$ZIPFILE" 'webroot/*' -d "$MODPATH" >&2

# Verify webroot integrity against per-file SHA256 sidecars generated at
# build time. Filenames under webroot/ are hashed (no spaces), so a glob-free
# find loop is safe here.
WEBROOT_DIR="$MODPATH/webroot"
if [ ! -d "$WEBROOT_DIR" ]; then
  ui_print "*********************************************************"
  ui_print "! webroot directory missing in zip!"
  abort    "*********************************************************"
fi
for f in $(find "$WEBROOT_DIR" -type f ! -name '*.sha256'); do
  rel="${f#$WEBROOT_DIR/}"
  if [ ! -f "$f.sha256" ]; then
    abort_verify "webroot/$rel.sha256 missing"
  fi
  (echo "$(cat "$f.sha256")  $f" | sha256sum -c -s -) || abort_verify "Failed to verify webroot/$rel"
done
ui_print "- Verified webroot" >&1
find "$WEBROOT_DIR" -name '*.sha256' -delete

ui_print "- Extracting common helpers"
unzip -o "$ZIPFILE" 'common/*' -d "$MODPATH" >&2
unzip -o "$ZIPFILE" 'common/.default' -d "$MODPATH" >&2
chmod 755 "$MODPATH/common/get_extra.sh"

# Write the root-manager marker read by the WebUI (cli.ts #resolveManager).
# KernelSU/APatch/Magisk export install-time env vars; persist the detected
# manager so the WebUI can pick the correct install/uninstall/denylist path.
if [ -n "$KSU" ] || [ -n "$KSU_VER_CODE" ]; then
  echo "MANAGER=KSU" > "$MODPATH/common/manager.sh"
elif [ -n "$APATCH" ] || [ -n "$APATCH_VER_CODE" ]; then
  echo "MANAGER=APATCH" > "$MODPATH/common/manager.sh"
elif [ -n "$MAGISK_VER_CODE" ]; then
  echo "MANAGER=MAGISK" > "$MODPATH/common/manager.sh"
else
  echo "MANAGER=" > "$MODPATH/common/manager.sh"
fi

CONFIG_DIR=/data/adb/omk
mkdir -p "$CONFIG_DIR"
rm -f "$CONFIG_DIR/restart.keymint" "$CONFIG_DIR/restart.injector" "$CONFIG_DIR/restart.all"
rm -f "$CONFIG_DIR/keymint" "$CONFIG_DIR/inject" "$CONFIG_DIR/injector" # clean up old hot-update binaries

if [ ! -f "$CONFIG_DIR/omkdata" ]; then
  ln -s /data/misc/keystore/omk "$CONFIG_DIR/omkdata"
fi
