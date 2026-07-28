MODDIR=${0%/*}
STATE_DIR=/data/adb/omk

mkdir -p "$STATE_DIR"

pid_matches_script() {
  pid=$1
  script=$2
  [ -r "/proc/$pid/cmdline" ] || return 1
  cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null)
  echo "$cmdline" | grep -F "$script" >/dev/null 2>&1
}

start_daemon() {
  script=$1
  pidfile=$2

  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && pid_matches_script "$pid" "$script"; then
      return 0
    fi
    rm -f "$pidfile"
  fi

  sh "$script" &
  pid=$!
  echo $pid > "$pidfile"
  sleep 1
  if ! kill -0 "$pid" 2>/dev/null || ! pid_matches_script "$pid" "$script"; then
    rm -f "$pidfile"
    return 1
  fi
  return 0
}

start_daemon "$MODDIR/daemon" "$STATE_DIR/keymint-daemon.pid"
start_daemon "$MODDIR/daemon-injector" "$STATE_DIR/injector-daemon.pid"

# Apply prop-level hiding (hide_props.conf: one prop per line; a bare prop name
# deletes it, "prop=value" sets the value). Runs in service.sh so resetprop
# operates after all system properties are loaded. Re-applied from the WebUI on
# demand.
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
