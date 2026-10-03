#!/system/bin/sh
cd /data/local/tmp/aarkanum
setsid /data/local/tmp/node-runtime/ld-musl-aarch64.so.1 --library-path /data/local/tmp/node-runtime /data/local/tmp/node-runtime/node node-tests/entangle-peer.mjs "$@" </dev/null >> /data/local/tmp/aarkanum/peer.log 2>&1 &
