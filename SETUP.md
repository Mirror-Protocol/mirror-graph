# Mirror API Server setup
## Prerequisites
* [LocalTerra](https://github.com/terra-project/LocalTerra)
* [mirror-oracle](https://github.com/terra-project/mirror-oracle.git)
* direnv
* PostgreSQL > v12
* keystore.json and ormconfig for mirror-api-server
* voter.json for mirror-oracle/mirror-feeder

## Setup PostgreSQL database
Create User and database and edit ormconfig.js accordingly.

## Setup mirror-oracle
### Add .envrc to mirror-feeder
```
$ cd mirror-feeder
$ cat > .envrc
export TERRA_LCD='http://localhost:1317/'
export TERRA_CHAIN_ID='localterra'
export PRICE_SERVER_URL='http://localhost:8531/latest'
<CTRL-C>
$ direnv allow
```
### Copy voter.json
```
$ cp voter.json mirro-feeder
```

## Steps
### Create .envrc, keystore.json, ormconfig.js files
```
$ cd mirror-api-server
$ cat > .envrc
export KEYSTORE_PATH='./keystore.json'
export CONTRACT_ID=-1
export TERRA_FCD='http://localhost:3060'
export TERRA_LCD='http://localhost:1317/'
export TERRA_CHAIN_ID='localterra'
<CTRL-C>
$ direnv allow
$ cp keystore.json .
$ cp ormconfig.js .
```

### Send UST to owner and oracle account
Send 1000000000 UST to owner (terra18tamrs6p3auq0ldz0h9nylptp7a2v9njpzkfc4)
Send 10000 UST to oracle (terra14xnr2483w29u22kqkappwr3ey2pa0fj2a98z5w)

### store-code
wasm 컨트랙트들을 체인에 올리고 코드 아이디들은 codeIds.json 에 저장
```
yarn cli store-code -p TerraLuna1@# --all
```

### create
codeIds.json 에 생성된 코드번호들로 gov 관련된 컨트랙들 쫙 생성해주고 GovEntity, ContractEntity 에 저장
```
yarn cli create -p TerraLuna1@#
```

### whitelisting-testnet
종목들 체인에 생성하면서 AssetEntity, ContractEntity 에 내용 저장되고 오라클 주소들은 address.json 에 저장됨

```
yarn cli whitelisting-testnet --owner TerraLuna1@#
```

### Start oracle voting
mirror-feeder 에 3번에서 생성된 address.json 와 voter.json 을 복사하고 yarn start 로 오라클 투표 시작
```
cp <mirror-api-server dir>/address.json mirror-feeder
cp voter.json mirror-feeder
yarn start
```

### Mint & Add liquidity
> mirror-oracle 이 투표된 이후에 사용해야 함
```
yarn cli lp-testnet -p TerraLuna1@#
```

### Other commands
```
yarn cli buy-simul mAAPL 50000000mVIXY
yarn cli sell-simul 112334mVIXY
yarn cli buy mVIXY 50000000uusd --owner TerraLuna1@#
yarn cli sell 12345mVIXY --owner TerraLuna1@#
```
