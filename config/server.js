module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  //Cron job for every day night 12:00 AM, to run the expired contracts
  cron: {
    enabled: true,
    tasks: {
      '0 0 0 * * *': async ({ strapi }) => {
        
        let ctx = {
          request: 
          {
            method: 'GET',
            body: {
              contractId: null
            }
          }
        };

        await strapi.api["test-collection"].controllers["test-collection"].contractExpire(ctx)
        .then(async(data) => {
          console.log(data);
        }).catch(err => console.log(err));
      },
    }
  },
});
