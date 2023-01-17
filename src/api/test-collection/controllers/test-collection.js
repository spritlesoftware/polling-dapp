'use strict';

const ethers = require('ethers');
const { formatEther, formatUnits, UnicodeNormalizationForm } = require('ethers/lib/utils');
const { format } = require('mysql');

/**
 * test-collection controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

/**
 * getWeb3UserInit() will initalize the singer object using given params. Internal function, as API call
 * @param {*} localUser Boolean variable, True if localuser going to be used, else False
 * @param {*} user If localUser is false, then user details should be passed
 * @returns {*} signed user object
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

/**
 * Connect to the given contract address to do the blockchain transactions. Internal funcion, not as a API call
 * @param {*} userDet is user-details object with privatekey, if privatekey is not provided, default user's privatekey will be used
 * @param {*} _contractAddress address of the contract deployed to the network
 * @returns votingContract object
 */
const connectToContract = async (userDet, _contractAddress) => {
  try {
    userDet = (userDet) ? userDet : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };
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
    console.log(err);
    return null;
  }
};

module.exports = createCoreController('api::test-collection.test-collection', ({ strapi }) => ({
    async exampleAction(ctx) {
      try {
        console.log("inside example Action");
        ctx.body = "hello world";
      } catch (err) {
        ctx.body = "=== error: " + err;
      }
    },

    /**
     * This function is for get singin the user and initialize the singer object.
     * @param {*} ctx is RequestContext object will have the request params with required params
     * @returns the status of the user initialization
     */
    async signerInit(ctx) {

      let returnable = {};

      try {
        if (ctx.request.body.localUser) {
          await getWeb3UserInit(true).then((signer) => {
            signer.getBalance().then(data => {
              returnable.userBalance = formatUnits(data, 'ether');
            });
          }).catch(err => {
            returnable.error = err;
          });
        } else {
          if (!ctx.request.body.user) {
            returnable.error = "privateKey not shared";
            return returnable;
          }
          
          await getWeb3UserInit(false, ctx.request.body.user).then((signer) => {
            signer.getBalance().then(data => {
              returnable.userBalance = formatUnits(data, 'ether');
            });
          }).catch(err => {
            returnable.error = err;
          });
        }
      } catch (err) {
        returnable.error = err;
      }

      return returnable;
    },

    /**
     * After singned-in the user, getting balance of the user from their ethereum wallet
     * @param {*} ctx Context-request, with user.privatekey to get wallet balance
     * @returns user balance from the ethereum wallet
     */
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

        let returnable = {};

        await getWeb3UserInit(false, user).then((signer) => {
          signer.getBalance().then(data => {
            returnable.balance = formatUnits(data, 'ether');
          });
        });
      } 
      catch (err) {
        returnable.error = err;
      }
    },

    /**
     * Vote for the given candidate, to corresponding contract
     * @param {*} ctx Context-request, will contains contractId, user:{username, usermail, privatekey (to vote as a diff user)}, candidate
     * @returns Voted status or acknowledgement
     */
    async votingC_vote(ctx) {

      if (ctx.request.body.user == undefined) {
        return {"error": "user.usermail is mandatory"};
      }
      
      const entity = await strapi.service('api::test-collection.test-collection');

      let checkAlreadyVoted = false;

      let listOfVoters = null;

      let contractAddress = null;

      let error = null;

      try {
        checkAlreadyVoted = await entity.findOne(ctx.request.body.contractId).then(async(obj) => {
          if (obj == undefined) {
            error = "Given contract-id is not found on the DB";
            return false;
          }
          if (obj.listOfVoters.find(element => element == ctx.request.body.user.usermail)) {
            error = "already voted";
            return false;
          }
          listOfVoters = obj.listOfVoters;
          contractAddress = obj.contract_address;
          return true;
        });
      } catch (ee) {
        console.log(ee);
        error = ee;
      }

      if (!checkAlreadyVoted)
        return {"error": error};

      let returnable = {};
      
      await connectToContract(ctx.request.body.user, contractAddress)      // Connecting to contract
        .then(async (votingContract) => {
            await votingContract.Vote(ctx.request.body.candidate)   // Voting on Blockchain
              .then(async() => {          
                returnable.status = true;
                
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
                returnable.error = err;
              })
        });
      return returnable;
    },

    /**
     * To deploy a new Polling contract to the network
     * @param {*} ctx request context, with { user.privatekey, user.usermail}, statement and candidates
     * @returns the new deployed contract address and contractId
     */
    async votingC_newPollDeploy(ctx) {
      let user = null; //(ctx.request.body.user) ? ctx.request.body.user : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };
      //user = (ctx.request.body.user.privatekey) ? ctx.request.body.user : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };

      if (ctx.request.body.user) {
        if (ctx.request.body.user.usermail == undefined) {
          return {"error": "User object with usermail is mandatory"};
        }
        user = (ctx.request.body.user.privatekey) ? ctx.request.body.user : { "usermail": ctx.request.body.user.usermail, "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };
      } else {
        return {"error": "User object with usermail is mandatory"};
      }

      let returnable = {};

      await getWeb3UserInit(false, user).then(async(signer) => {
        const contract_det = require(process.env.CONTRACT_ABI);

        // The factory we use for deploying contracts
        let factory = new ethers.ContractFactory(contract_det.abi, contract_det.bytecode, signer);

        // Deploy an instance of the contract
        await factory.deploy(ctx.request.body.statement, ctx.request.body.candidates).then(async(contract) => {
          // The address is available immediately, but the contract
          // is NOT deployed yet
          // console.log(contract.address);

          // The transaction that the signer sent to deploy
          // contract.deployTransaction

          // Wait until the transaction is mined (i.e. contract is deployed)
          //  - returns the receipt
          //  - throws on failure (the reciept is on the error)
          const recp = await contract.deployTransaction.wait();
          returnable.contractAddress = recp.contractAddress;
        });
      });

      // **** DB store ****//
      const entity = await strapi.service('api::test-collection.test-collection');

      try {
        let req = {
            "data": {
                "contract_address": returnable.contractAddress,
                "state": "Polling",
                "creator": ctx.request.body.user.usermail,
                "listOfVoters": []
            }
        };
        req.data.publishedAt = Date.now();
        await entity.create(req).then(async(obj) => {
          returnable.contracId = obj.id;
        });
      } catch (ee) {
        console.log(ee);
        returnable.error = ee;
      }

      return returnable;
    },

    /**
     * To getting the Poll details, like poll statement and poll's list of candidates. This function will not cost us.
     * @param {Context} ctx Request object, will contain the user.privatekey, contractId. If ctx had "withVotesCount=true", then it'll returns with each candidates vote count till now
     * @returns the statement of the poll and candidates list
     */
    async getPollDetails(ctx) {

      let contractAddress = undefined;

      try {
        await strapi.service('api::test-collection.test-collection').findOne(ctx.request.body.contractId)   //Database search for contract with contract-id
          .then(async(obj) => {
            if (obj == undefined) {
              console.log("Given contract-id is not found on the DB");
              returnable.error = "Given contract-id is not found on the DB";
              return;
              };
            contractAddress = obj.contract_address;
          });

      } catch (ee) {
        console.log(ee);
        returnable.error = ee;
      }

      if (contractAddress == undefined)
        return {"error": returnable};

      let returnable = {};

      await connectToContract(ctx.request.body.user, contractAddress)      // Connecting to contract
        .then(async (votingContract) => {

          await votingContract.getStatement()         //getting Statement of the poll
              .then(async(statement) => {     
                returnable.statement = statement;
                await votingContract.getCandidates()    //getting Candidates of the poll
                  .then(async(cands) => {
                    if (ctx.request.body.withVotesCount) {
                      await votingContract.VoteInfo().then(async(data) => {
                        returnable.candidates = [];
                        for(let i=0;i<cands.length;i++) {
                          let candidate = {"candidate": cands[i], "count": data[i].toNumber()};
                          returnable.candidates.push(candidate);
                        }
                      }).catch((err) => {
                        console.log("=== ", err);
                        returnable.error = err;
                      });
                    } else {
                      returnable.candidates = cands;
                    }
                  }).catch((err) => {
                    console.log("=== ", err);
                    error = err;
                  });
              }).catch((err) => {
                console.log("=== ", err);
                returnable.error = err;
              });
        });
      
      return returnable; 
    },

    /**
     * Get the user-group of the given user's mail-id, and returns the currently open-polls
     * @param {*} ctx Context-request will contains the user.usermail
     * @returns corresponding user's userid if the given mail-id is registered
     */
    async myRole(ctx) {
      const entity = await strapi.service('plugin::users-permissions.user');

      let cmt = "SELECT role_id FROM up_users_role_links where user_id=(select id from up_users where email=\'" + ctx.request.body.user.usermail + "\')";

      let returnable = {};

      returnable.role_id = await strapi.db.connection.raw(cmt).then(async(obj) => {
        if (obj[0].length != 0)
          return obj[0][0].role_id;
        else 
          return {};
      });

      if (JSON.stringify(returnable.role_id) == "{}")
        return returnable;

      cmt = "SELECT id, created_at, creator, list_of_voters FROM test_collections where state=\'Polling\'";
      
      returnable.polls = await strapi.db.connection.raw(cmt).then(async (obj) => {
        if (obj[0].length != 0)
        {
          return obj[0];
        }
        else 
          return {};
      });

      for(let i=0;i<returnable.polls.length;i++) {    //for each live polls, iterating
        
        let votedPersons = JSON.parse(returnable.polls[i].list_of_voters);
      
        if (votedPersons.find(element => element == ctx.request.body.user.usermail))
          returnable.polls[i].voted = true;
        else
          returnable.polls[i].voted = false;

        returnable.polls[i].votesCount = votedPersons.length;
        delete returnable.polls[i].list_of_voters;
      }

      return returnable;
    },

    /**
     * Closes the contract and declaring the result
     * @param {*} ctx Context request, with body parameters of user.privatekey, contractId
     * @returns the winner candidate's name and voting count for the candidate
     */
    async announceResult(ctx) {

      ctx.request.body.withVotesCount = true;

      return await this.getPollDetails(ctx).then(async(op) => {
        let max = {
          "candidate": "",
          "i": 0,
          "count": 0
        }
  
        let i = 0;
        op.candidates.forEach(element => {
          if(element.count > max.count)
          {
            max.count = element.count;
            max.i = i;
            max.candidate = element.candidate;
          }
          i++;
        });


        //**** update listOfVoters[] in DB - START **** */

        let payload = {
          "data": {
            "state": "Polling_Ended",
            "result": max.candidate
          }
        };

        await strapi.entityService.update("api::test-collection.test-collection", ctx.request.body.contractId, payload);
        //**** update listOfVoters[] in DB - END **** */

        delete max.i;
        return max;
      });
    }

  }));