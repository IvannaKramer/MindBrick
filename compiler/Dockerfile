# Builds nbc.wasm: the NBC/NXC compiler (Free Pascal) compiled to WebAssembly (WASI).
#
#   docker build -t mindbrick-nbc compiler/
#   docker run --rm mindbrick-nbc cat /out/nbc.wasm > web/nbc.wasm
#   node compiler/test/compare.mjs          # must print PASS for every program
#
# Stage 1 builds the Free Pascal WebAssembly cross-compiler from FPC's development branch
# (the stable FPC 3.2.2 cannot target WebAssembly yet). Stage 2 compiles NBC with it.
# Stage 3 shrinks the result with wasm-opt. Source versions are pinned so that a rebuild
# gives the same compiler; bump them on purpose, then re-run the comparison test.

FROM debian:bookworm-slim AS fpcwasm
RUN apt-get update && apt-get install -y --no-install-recommends \
      fpc-3.2.2 git make ca-certificates binutils && rm -rf /var/lib/apt/lists/*
ARG FPC_COMMIT=52d834850ba158221a2af8d58eb58bbf86075b05
RUN git init -q /fpc && cd /fpc \
 && git fetch -q --depth 1 https://gitlab.com/freepascal.org/fpc/source.git ${FPC_COMMIT} \
 && git checkout -q FETCH_HEAD
WORKDIR /fpc
RUN make -j"$(nproc)" all OS_TARGET=wasip1 CPU_TARGET=wasm32 BINUTILSPREFIX= OPT="-O-" PP=fpc \
 && make crossinstall OS_TARGET=wasip1 CPU_TARGET=wasm32 BINUTILSPREFIX= PP=fpc INSTALL_PREFIX=/opt/fpcwasm

FROM fpcwasm AS nbc
# NBC 1.2.1.r4 by John Hansen (MPL 1.1), in a fork that builds with current Free Pascal.
ARG NBC_COMMIT=23332f811fff1333cc6517bf99e8f4c24901c134
RUN git init -q /nbc && cd /nbc \
 && git fetch -q --depth 1 https://github.com/pierre-24/nbc-compiler.git ${NBC_COMMIT} \
 && git checkout -q FETCH_HEAD
WORKDIR /nbc/src/NXT
# NBC embeds its header files (NXCDefs.h ...) as Pascal data; that generator runs natively.
RUN make PPC=fpc mkdata NBCCommonData.pas NXTDefsData.pas NXCDefsData.pas nbc_preproc.inc \
      DEFAULT_INCLUDE_DIR=/include \
 && rm -f *.o *.ppu ../commons/*.o ../commons/*.ppu
# Our changes to NBC, if any, live in patches/ (MPL 1.1 asks for modifications to be published).
COPY patches/ /patches/
RUN for p in /patches/*.patch; do [ -e "$p" ] || continue; echo "applying $p"; git -C /nbc apply "$p"; done
# No -dCAN_DOWNLOAD: NBC's own USB/Bluetooth download code is left out, the browser does that part.
# The quotes around -Fu keep the shell from expanding the *, Free Pascal expands it itself.
RUN V=$(ls /opt/fpcwasm/lib/fpc/) \
 && /opt/fpcwasm/lib/fpc/$V/ppcrosswasm32 -Twasip1 "-Fu/opt/fpcwasm/lib/fpc/$V/units/wasm32-wasip1/*" \
      -S2cdghi -dRELEASE -O2 -Xs -Fu../commons -Fu. nbc.dpr -onbc.wasm

FROM node:22-bookworm-slim AS opt
RUN npm install -g binaryen@132.0.0
COPY --from=nbc /nbc/src/NXT/nbc.wasm /tmp/nbc.wasm
# The --enable flags name the WebAssembly features Free Pascal's output uses (all in current browsers).
RUN mkdir /out && wasm-opt -O2 --strip-debug --strip-producers \
      --enable-reference-types --enable-bulk-memory --enable-nontrapping-float-to-int \
      --enable-sign-ext --enable-mutable-globals /tmp/nbc.wasm -o /out/nbc.wasm && ls -l /out
