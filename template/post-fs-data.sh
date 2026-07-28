MODDIR=${0%/*}
TARGET_DIR=/data/misc/keystore/omk
LOG_DIR=$TARGET_DIR/logs
TARGET_KEYBOX=$TARGET_DIR/keybox.xml
TARGET_INJECTOR_CONFIG=$TARGET_DIR/injector.toml
STATE_DIR=/data/adb/omk


mkdir -p "$TARGET_DIR"
chmod 0770 "$TARGET_DIR"
chown 1017:1017 "$TARGET_DIR"

mkdir -p "$LOG_DIR"
chmod 0770 "$LOG_DIR"
chown 1017:1017 "$LOG_DIR"

mkdir -p "$STATE_DIR"
rm -f "$STATE_DIR/keymint-daemon.pid" "$STATE_DIR/injector-daemon.pid"
rm -f "$STATE_DIR/restart.keymint" "$STATE_DIR/restart.injector" "$STATE_DIR/restart.all"

if [ ! -f "$TARGET_KEYBOX" ] && [ -f "$MODDIR/keybox.xml" ]; then
  cp "$MODDIR/keybox.xml" "$TARGET_KEYBOX"
fi

if [ ! -f "$TARGET_INJECTOR_CONFIG" ] && [ -f "$MODDIR/injector.toml" ]; then
  cp "$MODDIR/injector.toml" "$TARGET_INJECTOR_CONFIG"
fi

if [ -f "$TARGET_KEYBOX" ]; then
  chmod 0600 "$TARGET_KEYBOX"
  chown 1017:1017 "$TARGET_KEYBOX"
fi

if [ -f "$TARGET_INJECTOR_CONFIG" ]; then
  chmod 0600 "$TARGET_INJECTOR_CONFIG"
  chown 1017:1017 "$TARGET_INJECTOR_CONFIG"
fi

# Apply prop-level hiding (hide_props.conf: one prop per line; a bare prop name
# deletes it, "prop=value" sets the value). Runs early so props are hidden
# before apps read them. Re-applied from the WebUI on demand.
HIDE_PROPS_CONF="$STATE_DIR/hide_props.conf"
RESETPROP_BIN=
for rp in /system_ext/bin/resetprop /system/bin/resetprop /data/adb/ksu/bin/resetprop /data/adb/magisk/resetprop; do
  [ -x "$rp" ] && RESETPROP_BIN="$rp" && break
done
[ -z "$RESETPROP_BIN" ] && command -v resetprop >/dev/null 2>&1 && RESETPROP_BIN=resetprop
if [ -f "$HIDE_PROPS_CONF" ] && [ -n "$RESETPROP_BIN" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="$(echo "$line" | tr -d '[:space:]')"
    [ -z "$line" ] && continue
    case "$line" in
      *=*)
        prop="${line%%=*}"
        val="${line#*=}"
        "$RESETPROP_BIN" -n "$prop" "$val" >/dev/null 2>&1
        ;;
      *)
        "$RESETPROP_BIN" -d "$line" >/dev/null 2>&1
        ;;
    esac
  done < "$HIDE_PROPS_CONF"
fi
