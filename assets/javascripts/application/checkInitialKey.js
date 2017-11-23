function checkInitialKey(web3, initialKey, contractAddr, abi, cb) {
  let KeysStorage = attachToContract(web3, abi, contractAddr)
  console.log("attach to oracles contract");
  if (!KeysStorage) {
    return cb();
  }

  KeysStorage.methods.checkInitialKey("0x" + initialKey).call(function(err, isNew) {
    if (err) {
      console.log(err)
    }
    cb(isNew);
  })
}