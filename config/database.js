module.exports = ({ env }) => ({
  connection: {
    client: 'mysql',
    connection: {
      host: env('DATABASE_HOST', '192.168.56.1'),
      port: env.int('DATABASE_PORT', 3306),
      database: env('DATABASE_NAME', 'nodejs_backend'),
      user: env('DATABASE_USERNAME', 'dapp'),
      password: env('DATABASE_PASSWORD', '7761'),
      ssl: env.bool('DATABASE_SSL', false),
    },
  },
});
