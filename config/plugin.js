module.exports = ({ env }) => ({
    
    email: {
      config: {
        provider: 'sendmail', // For community providers pass the full package name (e.g. provider: 'strapi-provider-email-mandrill')
        providerOptions: {
          apiKey: env('JWT_SECRET'),
        },
        settings: {
          defaultFrom: 'mohan.creator.k@gmail.com',
          defaultReplyTo: 'juliasedefdjian@strapi.io',
          testAddress: 'mohan.creator.k@gmail.com',
        },
      },
    },

    upload: {
        config: {
          providerOptions: {
            localServer: {
              maxage: 300000
            },
          },
        },
      },
  });