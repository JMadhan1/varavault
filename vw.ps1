# Wrapper: runs vara-wallet in Docker with workspace + wallet data mounted
# Usage: .\vw.ps1 <vara-wallet args...>
# Example: .\vw.ps1 --network mainnet --json balance kGiFzKMJ...
docker run --rm `
  -v "${PWD}:/workspace" `
  -v "$env:USERPROFILE\.vara-wallet:/root/.vara-wallet" `
  varavault-cli @args
