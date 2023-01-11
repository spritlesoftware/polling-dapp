'use strict';

const ethers = require('ethers');
const { formatEther, formatUnits } = require('ethers/lib/utils');
const { format } = require('mysql');

/**
 * test-collection controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

/**
 * getWeb3UserInit() will initalize the singer object using given params
 * @param {*} localUser Boolean variable, True if localuser going to be used, else False
 * @param {*} user If localUser is false, then user details should be passed
 */
const getWeb3UserInit = async(localUser, user=null) => {
  const provider = new ethers.providers.AlchemyProvider(process.env.NETWORK, process.env.ALCHEMY_KEY);    // Define an Alchemy Provider

  let privateKey = null;

  if (localUser) {
    privateKey = process.env.ACCOUNT_PRIVATE_KEY;     // Create a signer, with local privatekey
  } else {
    privateKey = user.privatekey;                     // Create a signer, with given privatekey
  }

  const signer = new ethers.Wallet(privateKey, provider);  // Creating a wallet with the user's private key and provider

  return signer;
};

const connectToContract = async (userDet, _contractAddress) => {
  try {
    let user = (userDet.privateKey) ? userDet : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };

    const votingContract = await getWeb3UserInit(false, user).then((signer) => {
      const contract = require(process.env.CONTRACT_ABI);  //Getting compiled solidity's ABI file as a JSON
      const abi = contract.abi;                       // Get contract ABI
      const contractAddress = (_contractAddress) ? _contractAddress : process.env.CONTRACT_DEPLOYED_ADDR;   //Contract's deployed address in the network
      const votingContract = new ethers.Contract(contractAddress, abi, signer);   // Create a contract instance
      return votingContract;
    });
    return votingContract;
  }
  catch (err) {
    return null;
  }
};

module.exports = createCoreController('api::test-collection.test-collection', ({ strapi }) => ({
    // Method 1: Creating an entirely custom action
    async exampleAction(ctx) {
      try {
        console.log("inside example Action");
        ctx.body = "hello world";
      } catch (err) {
        ctx.body = "=== error: " + err;
      }
    },

    /**
     * This function is for get the user signed.
     * @param {*} ctx is RequestContext object will have the request params
     */
    async signerInit(ctx) {
      try {
        if (ctx.request.body.localUser) {
          await getWeb3UserInit(true).then((signer) => {
            // console.log("=== init done");
            ctx.body = "Initialization done ";
            signer.getBalance().then(data => {
              ctx.body = ctx.body + formatUnits(data, 'ether');
              console.log("=== ", ctx.body);
            });
          }).catch(err => {
            // console.log("=== getWeb3UserInit() is on error: " + err);
            ctx.body = "=== error: " + err;
          });
        } else {
          if (!ctx.request.body.user) {
            ctx.body = "=== error: privateKey not shared";
            return;
          }
          await getWeb3UserInit(false, ctx.request.body.user).then((signer) => {
            // console.log("=== init done");
            ctx.body = "Initialization done ";
            signer.getBalance().then(data => {
              ctx.body = ctx.body + formatUnits(data, 'ether');
              console.log("=== ", ctx.body);
            });
          }).catch(err => {
            // console.log("=== getWeb3UserInit() is on error: " + err);
            ctx.body = "=== error: " + err;
          });
        }
      } catch (err) {
        ctx.body = "=== error: " + err;
      }
    },

    async getBalance(ctx) {
      try {
        let user = null;
        if (ctx.request.body.user) {
          user = ctx.request.body.user;
        } else {
          user = {
            "privatekey": process.env.ACCOUNT_PRIVATE_KEY
          };
        }

        await getWeb3UserInit(false, user).then((signer) => {
          ctx.body = "signer bal: ";
          signer.getBalance().then(data => {
            ctx.body = ctx.body + formatUnits(data, 'ether');
            console.log("=== ", ctx.body);
          });
        });
      } 
      catch (err) {
        ctx.body = "=== error: " + err;
      }
    },

    /**
     * Vote for the given candidate, to corresponding contract
     * @param {*} ctx Context-request, will contains contractId, user:{username, usermail, privatekey (to vote as a diff user)}, candidate
     * @returns 
     */
    async votingC_vote(ctx) {
      
      const entity = await strapi.service('api::test-collection.test-collection');

      let checkAlreadyVoted = false;

      let listOfVoters = null;

      let contractAddress = null;

      try {
        checkAlreadyVoted = await entity.findOne(ctx.request.body.contractId).then(async(obj) => {
          if (obj == undefined) {
            ctx.body = "Given contrac-id is not found on the DB";
            return false;
          }
          if (obj.listOfVoters.find(element => element == ctx.request.body.user.usermail)) {
            ctx.body = "already voted";
            return false;
          }
          listOfVoters = obj.listOfVoters;
          contractAddress = obj.contract_address;
          return true;
        });
      } catch (ee) {
        console.log(ee);
        ctx.body = "=== error: " + ee;
      }

      if (!checkAlreadyVoted)
        return;
      
      await connectToContract(ctx.request.body.user, contractAddress)      // Connecting to contract
        .then(async (votingContract) => {
            await votingContract.voteForCandidate(ctx.request.body.candidate)   // Voting on Blockchain
              .then(async() => {          
                console.log("voted");
                ctx.body = "voted";
                
                //**** update listOfVoters[] in DB - START **** */
                listOfVoters.push(ctx.request.body.user.usermail);

                let payload = {
                  "data": {
                    "listOfVoters": listOfVoters
                  }
                };
                
                await strapi.entityService.update("api::test-collection.test-collection", ctx.request.body.contractId, payload);
                //**** update listOfVoters[] in DB - END **** */

              }).catch((err) => {
                console.log("=== error: ", err);
                ctx.body = "=== error: " + err;
              })
        });
    },

    /**
     * Getting the votes count for the given candidate, from corresponding contract
     * @param {*} ctx Contract-request, will contain the contract-id, user (optional), candidate
     * @returns 
     */
    async votingC_votesForCandidate(ctx) {
      
      let contractAddress = undefined;
      try {
        
        await entity.findOne(ctx.request.body.contractId)   //Database search for contract with contract-id
          .then(async(obj) => {
            if (obj == undefined) {
              ctx.body = "Given contract-id is not found on the DB";
              return false;
            }
            
            contractAddress = obj.contract_address;
          });

      } catch (ee) {
        console.log(ee);
        ctx.body = "=== error: " + ee;
      }

      if (contractAddress == undefined)
        return;

      await connectToContract(ctx.request.body.user, contractAddress)    //connect to contract for getting the voting counts
        .then(async (votingContract) => {
            await votingContract.totalVotesFor(ctx.request.body.candidate)
              .then((data) => {          
                console.log("votes for Candidate: " + data);
                ctx.body = "votes for Candidate: " + data;
              }).catch((err) => {
                console.log("=== ", err);
                ctx.body = "=== error " + err;
              })
        });
    },

    /**
     * To deploy a new Polling contract to the network
     * @param {*} ctx request context, with { user.privatekey, user.usermail}, statement and candidates
     */
    async votingC_newPollDeploy(ctx) {
      let user = (ctx.request.body.user) ? ctx.request.body.user : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };

      await getWeb3UserInit(false, user).then(async(signer) => {
        const contract_det = require(process.env.CONTRACT_ABI);

        // The factory we use for deploying contracts
        let factory = new ethers.ContractFactory(contract_det.abi, contract_det.bytecode, signer);

        // Deploy an instance of the contract
        await factory.deploy(ctx.request.body.statement, ctx.request.body.candidates).then(async(contract) => {
          // The address is available immediately, but the contract
          // is NOT deployed yet
          console.log(contract.address);

          // The transaction that the signer sent to deploy
          // contract.deployTransaction

          // Wait until the transaction is mined (i.e. contract is deployed)
          //  - returns the receipt
          //  - throws on failure (the reciept is on the error)
          const recp = await contract.deployTransaction.wait();
          ctx.body = recp.contractAddress;
        });
      });

      // **** DB store ****//
      const entity = await strapi.service('api::test-collection.test-collection');

      try {
        let req = {
            "data": {
                "contract_address": ctx.body,
                "state": "Polling",
                "creator": ctx.request.body.user.usermail,
                "listOfVoters": []
            }
        };
        req.data.publishedAt = Date.now();
        await entity.create(req).then(async(obj) => {
          console.log("obj_id: ", obj.id);
          ctx.body = obj.id;
        });
      } catch (ee) {
        console.log(ee);
        ctx.body = "=== error: " + ee;
      }
    },
  }));