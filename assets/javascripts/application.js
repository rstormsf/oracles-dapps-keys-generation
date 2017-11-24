function generateAddress(cb) {
  var params = { keyBytes: 32, ivBytes: 16 };

  var dk = keythereum.create(params);

  keythereum.create(params, function (dk) {
    var options = {};
    var password = generatePassword();
    keythereum.dump(password, dk.privateKey, dk.salt, dk.iv, options, function (keyObject) {
      console.log(keyObject);
      console.log(JSON.stringify(keyObject));
      cb(keyObject, password);
    });
  });
}

function generatePassword() {
  return passwordGenerator(20, false);
}
function addValidator(web3, validatorViewObj, contractAddr, abi, cb) {
  console.log("***Add validator function***");
  let ValidatorsStorage = attachToContract(web3, abi, contractAddr)
  console.log("attach to oracles contract");
  if (!ValidatorsStorage) {
    return cb();
  }

  console.log(validatorViewObj);
  console.log(ValidatorsStorage);

  var txHash;
  var gasPrice = web3.utils.toWei(new web3.utils.BN(1), 'gwei')
  var opts = {from: web3.eth.defaultAccount, gasPrice: gasPrice}
  
  ValidatorsStorage.methods.addValidator(validatorViewObj.miningKey, 
    validatorViewObj.zip, 
    validatorViewObj.licenseID,
    validatorViewObj.licenseExpiredAt,
    validatorViewObj.fullName,
    validatorViewObj.streetName,
    validatorViewObj.state
    )
  .send(opts)
  .on('error', error => {
    return cb(txHash, error);
  })
  .on('transactionHash', _txHash => {
    console.log("contract method transaction: " + _txHash);
    txHash = _txHash;
  })
  .on('receipt', receipt => {
    return cb(txHash)
  });
}
function showAlert(err, msg) {
	if (!err) {
		swal({
		  title: "Error",
		  text: msg,
		  type: "error"
		});
	}
	else {
		if (err.type != "REQUEST_REJECTED") {
			swal({
			  title: "Error",
			  text: msg,
			  type: "error"
			});
		}
	}
}
function getBalance(address, cb) {
  web3.eth.getBalance(address, function(err, balance) {
    if (err) {
          console.log(err);
          $(".loading-container").hide();
          return;
        }

        cb(balance);
      });
}

function attachToContract(web3, abi, addr) {
  web3.eth.defaultAccount = web3.eth.accounts[0];
  console.log("web3.eth.defaultAccount:" + web3.eth.defaultAccount);
  
  let contractInstance = new web3.eth.Contract(abi, addr);
  
  return contractInstance;
}
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
//check current network page is connected to. Alerts, if not Oracles network
async function checkNetworkVersion(web3, cb) {
  var msgNotOracles = "You aren't connected to Oracles network. Please, switch on Oracles plugin and choose Oracles network. Check Oracles network <a href='https://github.com/oraclesorg/oracles-wiki' target='blank'>wiki</a> for more info.";
  let config = await getConfig()
  web3.eth.net.getId().then(function(connectedNetworkID) {
    console.log("connectedNetworkID: " + connectedNetworkID);
    connectedNetworkID = parseInt(connectedNetworkID);
    switch (connectedNetworkID) {
      case 1: {
        console.log('This is mainnet');
        swal("Warning", msgNotOracles, "warning"); 
        return false;
      } break;
      case 2: {
        console.log('This is the deprecated Morden test network.');
        swal("Warning", msgNotOracles, "warning");
        return false;
      } break;
      case 3: {
        console.log('This is the ropsten test network.');
        swal("Warning", msgNotOracles, "warning");
        return false;
      }  break;
       case config.networkID: {
         console.log('This is Oracles from Metamask');
         return true;
      }  break;
      default: {
        console.log('This is an unknown network.');
        swal("Warning", msgNotOracles, "warning");
        return false;
      } break;
    }
  })
}
function toUnifiedLengthLeft(strIn) {//for numbers
  var strOut = "";
  for (var i = 0; i < 64 - strIn.length; i++) {
    strOut += "0"
  }
  strOut += strIn;
  return strOut;
}

function countRows(strIn) {
  var rowsCount = 0;
  if (strIn.length%64 > 0)
    rowsCount = parseInt(strIn.length/64) + 1;
  else
    rowsCount = parseInt(strIn.length/64);
  return rowsCount;
}

function toUnifiedLengthRight(strIn) {//for strings
  var strOut = "";
  strOut += strIn;
  var rowsCount = countRows(strIn);
  for (var i = 0; i < rowsCount*64 - strIn.length; i++) {
    strOut += "0"
  }
  return strOut;
}

String.prototype.hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += hex.slice(-4);
    }

    return result
}

function toUTF8Array(str) {
    var utf8 = [];
    for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 
                      0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18), 
                      0x80 | ((charcode>>12) & 0x3f), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
}

function toHexString(byteArray) {
  return byteArray.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

function bytesCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}
function createKeys(web3, keys, contractAddr, abi, cb) {
  console.log("***Create keys function***");
  let KeysStorage = attachToContract(web3, abi, contractAddr)
  console.log("attach to oracles contract");
  if (!KeysStorage) {
    return cb();
  }

  console.log(keys);
  var txHash;
  var gasPrice = web3.utils.toWei(new web3.utils.BN(1), 'gwei')
  var opts = {from: web3.eth.defaultAccount, gasPrice: gasPrice}
  
  oraclesContract.methods.createKeys("0x" + keys.miningKey.miningKeyObject.address, 
    "0x" + keys.payoutKey.payoutKeyObject.address, 
    "0x" + keys.votingKey.votingKeyObject.address
  ).send(opts).on('error', error => {
    return cb(txHash, error);
  })
  .on('transactionHash', _txHash => {
    console.log("contract method transaction: " + _txHash);
    txHash = _txHash;
  })
  .on('receipt', receipt => {
    return cb(txHash)
  });
}
function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
//get current account chosen in MetaMask or opened at Parity
function getAccounts(cb) {
	web3.eth.getAccounts(function(err, accounts) {
		if (err) {
			$(".loading-container").hide();
			showAlert(err, err.message);
			return;
		}

		cb(accounts);
	});
}
//gets config file with address of Oracles contract
async function getConfig(cb) {
  	let config = await $.getJSON("./assets/javascripts/config.json")
	let contractAddress = config.Ethereum[config.environment].contractAddress
	let abi = config.Ethereum[config.environment].abi
	let networkID = config.networkID
	let configJSON = {
		contractAddress,
		networkID,
		abi
	}
	if (cb) cb(configJSON)
	return configJSON;
}
//gets web3 object from MetaMask or Parity
function getWeb3(callback) {
  if (typeof window.web3 === 'undefined') {
    // no web3, use fallback
    console.error("Please use a web3 browser");
    var msgNotEthereum = "You aren't connected to Oracles Network. Please, switch on Oracles plugin and refresh the page. Check Oracles network <a href='https://github.com/oraclesorg/oracles-wiki' target='blank'>wiki</a> for more info.";
    swal("Warning", msgNotEthereum, "warning");
    callback(myWeb3, false);
  } else {
    var myWeb3 = new Web3(window.web3.currentProvider); 

    myWeb3.eth.defaultAccount = window.web3.eth.defaultAccount;

    let isOraclesNetwork = checkNetworkVersion(myWeb3)
    callback(myWeb3, isOraclesNetwork);
  }
}
//launches main application
window.onbeforeunload = function(){
  return 'Are you sure you want to leave?';
};
function startDapp(web3, isOraclesNetwork) {
	$(function() {

		$(".loading-container").hide();
		if (!isOraclesNetwork) return;
		var keys = {
			"miningKey": {},
			"payoutKey": {},
			"votingKey": {}
		};

		getAccounts(async function(accounts) {
			let config = await getConfig()
			getConfigCallBack(web3, accounts, config.contractAddress, config.abi)
		});

		//getting of config callback
		function getConfigCallBack(web3, accounts, contractAddress, abi) {
			//checks if chosen account is valid initial key
			if (accounts.length == 1) {
				var possibleInitialKey = accounts[0].substr(2);
				checkInitialKey(web3,
				possibleInitialKey,
				contractAddress,
				abi,
				function(_isNew) {
					if (!_isNew) swal("Warning", "Current key isn't valid initial key. Please, choose your initial key in MetaMask and reload the page. Check Oracles network <a href='https://github.com/oraclesorg/oracles-wiki' target='blank'>wiki</a> for more info.", "warning");
				});
			} else if (accounts.length == 0) {
				swal("Warning", "You haven't chosen any account in MetaMask. Please, choose your initial key in MetaMask and reload the page. Check Oracles network <a href='https://github.com/oraclesorg/oracles-wiki' target='blank'>wiki</a> for more info.", "warning");
			}

			$(".create-keys-button").click(function() {
			    $("#initialKeySource").click();
			})

			$("#initialKeySource").change({contractAddress: contractAddress, abi:abi}, initialKeySourceOnChange);
		}

		function initialKeySourceOnChange(ev) {
			initialKeyChosen(this, ev.data.contractAddress, ev.data.abi, function(address) {
				generateAddresses(keys, function(_keys) {
					fillContractData(ev.data.contractAddress, ev.data.abi, _keys, address, function(err, address) {
						transferCoinsToPayoutKey(err, address, _keys);
					})
				});
			});
		};

		//triggers, if initial key is chosen
		function initialKeyChosen(el, contractAddress, abi, cb) {
			var file = $(el).prop('files')[0];
			$(el).remove();
			var newEl = "<input type='file' id='initialKeySource' />";
	    	$(newEl).change({contractAddress: contractAddress, abi:abi}, initialKeySourceOnChange).appendTo($(".create-keys"));
			var reader = new FileReader();
		    reader.readAsText(file, "UTF-8");
		    reader.onload = function (evt) {
		    	try {
			        a = JSON.parse(evt.target.result);
			    } catch(e) {
			        return swal("Error", "Invalid key file", "error");
			    }

		        var keyJSON = JSON.parse(evt.target.result); 
		        var address = keyJSON.address;
		        
		        if (!address) return swal("Error", "No address in key file", "error");

		        checkInitialKey(web3,
					address,
					contractAddress,
					abi,
					function(_isNew) {
						if (!_isNew) return swal("Error", "Initial key is already activated or isn't valid", "error");

						$(".loading-container").show();

						setTimeout(function() { 
							cb(address);
						}, 500)
					}
				);
		    }
		    reader.onerror = function (evt) {
		    	swal("Error", "Error in reading file", "error");
		    }
		}

		//validating of initial key callback: async generates 3 addresses: mining, payout, voting
		function generateAddresses(keys, cb) {
			var keysCount = 0;
			for (var i in keys) {
				keysCount++;
			}
			var keysIterator = 0;

			generateAddress(function(_miningKeyObject, password) {
				keysIterator++;
				keys.miningKey = {};
				_miningKeyObject.name = "miningKey";
				keys.miningKey.miningKeyObject = _miningKeyObject;
				keys.miningKey.password = password;

				if (keysIterator == keysCount) cb(keys);
			});
			generateAddress(function(_payoutKeyObject, password) {
				keysIterator++;
				keys.payoutKey = {};
				_payoutKeyObject.name = "payoutKey";
				keys.payoutKey.payoutKeyObject = _payoutKeyObject;
				keys.payoutKey.password = password;

				if (keysIterator == keysCount) cb(keys);
			});
			generateAddress(function(_votingKeyObject, password) {
				keysIterator++;
				keys.votingKey = {};
				_votingKeyObject.name = "votingKey";
				keys.votingKey.votingKeyObject = _votingKeyObject;
				keys.votingKey.password = password;

				if (keysIterator == keysCount) cb(keys);
			});
		}

		//Geeneration of all 3 addresses callback
		function fillContractData(contractAddress, abi, keys, address, cb) {
			$(".content").hide();
			$('.waiting-container').show();
			$('.waiting-container').empty();
			$('.waiting-container').append("<h2>Adding notary's data to Oracles contract...</h2>");
			var validatorViewObj = {
				miningKey: "0x" + keys.miningKey.miningKeyObject.address,
				fullName:  $("#full-name").val(),
				streetName: $("#address").val(),
				state: $("#state").val(),
				zip: $("#zip").val(),
				licenseID: $("#license-id").val(),
				licenseExpiredAt: new Date($("#license-expiration").val()).getTime() / 1000,
			};
			//adds notary personal data to contract
			addValidator(web3, 
				validatorViewObj,
				contractAddress,
				abi,
				function(txHash, err) {
					if (err) {
						loadingFinished();
						if (err.type != "REQUEST_REJECTED") swal("Error", "Error in addresses addition to contract", "error");
						return;
					}

					$(".content").hide();
					$('.waiting-container').show();
					$('.waiting-container').empty();
					$('.waiting-container').append("<h2>Adding production keys to Oracles contract...</h2>");
					//activate generated production keys
					createKeys(web3, 
						keys,
						contractAddress,
						abi,
						function(res, err) {
							if (err) {
								loadingFinished();
								console.log(err.message);
								if (err.type != "REQUEST_REJECTED") swal("Error", "Error in addresses addition to contract", "error");
								return;
							}

							cb(err, address);
						}
					);
				}
			);
		}

		//Production keys addition to contract callback
		function transferCoinsToPayoutKey(err, address, keys) {
			$(".content").hide();
			$('.waiting-container').show();
			$('.waiting-container').empty();
			$('.waiting-container').append("<h2>Transfering ether from initial key to payout key...</h2>");
			if (err) {
				loadingFinished();
				swal("Error", err.message, "error");
				return;
			}

			//chain:sends ether to payoutKey
			var to = "0x" + keys.payoutKey.payoutKeyObject.address;
			//gets balance of initial key
			getBalance(address, function(balance) {
				//calculates how many coins we can send from initial key to payout key
				var estimatedGas = new web3.utils.BN(21000);
				var gasPrice = web3.utils.toWei(new web3.utils.BN(1), 'gwei')
				calculateAmmountToSend(estimatedGas, gasPrice, balance, function(ammountToSend) {
					transferCoinsToPayoutKeyTx(estimatedGas, gasPrice, address, to, ammountToSend);
				});
	        });
		}

		function calculateAmmountToSend(estimatedGas, gasPrice, balance, cb) {
	      	var ammountToSend = balance.sub(new web3.utils.BN(20).mul(estimatedGas).mul(gasPrice));
	    	console.log("ammountToSend: " + ammountToSend);
	    	cb(ammountToSend);
		}

		function transferCoinsToPayoutKeyTx(estimatedGas, gasPrice, address, to, ammountToSend) {
			web3.eth.sendTransaction({
				"gas": estimatedGas, 
				"gasPrice": gasPrice,
				"from": address, 
				"to": to, 
				"value": ammountToSend}, function(err, txHash) {
        	    if (err) {
		          console.log(err);
		          loadingFinished();
		          return;
		        }
		        loadingFinished();
				swal("Success", "Keys are created", "success");
				$('.content').empty();
				loadKeysPage();
		    });
		}

		function loadKeysPage() {
			$('.content').load("./keys.html", function() {
				$("#miningKey").text("0x" + keys.miningKey.miningKeyObject.address);
				$("#payoutKey").text("0x" + keys.payoutKey.payoutKeyObject.address);
				$("#votingKey").text("0x" + keys.votingKey.votingKeyObject.address);

				$("#miningKeyPass").text(keys.miningKey.password);
				$("#payoutKeyPass").text(keys.payoutKey.password);
				$("#votingKeyPass").text(keys.votingKey.password);

				$("#copyMiningPass").attr("data-clipboard-text", keys.miningKey.password);
				$("#copyPayoutPass").attr("data-clipboard-text", keys.payoutKey.password);
				$("#copyVotingPass").attr("data-clipboard-text", keys.votingKey.password);

				buildCopyControl("copyMiningPass", "Mining key password copied");
				buildCopyControl("copyPayoutPass", "Payout key password copied");
				buildCopyControl("copyVotingPass", "Voting key password copied");

				$("#copyMiningKey").attr("data-clipboard-text", "0x" + keys.miningKey.miningKeyObject.address);
				$("#copyPayoutKey").attr("data-clipboard-text", "0x" + keys.payoutKey.payoutKeyObject.address);
				$("#copyVotingKey").attr("data-clipboard-text", "0x" + keys.votingKey.votingKeyObject.address);

				buildCopyControl("copyMiningKey", "Mining key copied");
				buildCopyControl("copyPayoutKey", "Payout key copied");
				buildCopyControl("copyVotingKey", "Voting key copied");

				$("#miningKeyDownload").click(function() {
					download("mining_key_" + keys.miningKey.miningKeyObject.address, JSON.stringify(keys.miningKey.miningKeyObject));
				});

				$("#payoutKeyDownload").click(function() {
					download("payout_key_" + keys.payoutKey.payoutKeyObject.address, JSON.stringify(keys.payoutKey.payoutKeyObject));
				});

				$("#votingKeyDownload").click(function() {
					download("voting_key_" + keys.votingKey.votingKeyObject.address, JSON.stringify(keys.votingKey.votingKeyObject));
				});
			});
		}

		function loadingFinished() {
			$(".loading-container").hide();
          	$(".waiting-container").hide();
	  		$(".content").show();
		}

		function buildCopyControl(id, msg) {
			var el = document.getElementById(id);
			var clipboard = new Clipboard( el );
		  	
		  	clipboard.on( "success", function( event ) {
		  		window.toastr.success(msg);
		    });
		}
	});
}

window.addEventListener('load', function() {
	getWeb3(startDapp);
});
