# ORMs Overview with Drizzle ORM Support

This project is a fork of [romeerez/orms-overview](https://github.com/romeerez/orms-overview/tree/master) with additional support for Drizzle ORM. The purpose of this project is to implement the [real world API](https://github.com/gothinkster/realworld) using different Node.js ORMs and compare their performance and usability.


Code for ORMs you can find in `src/orms`, for benchmark `src/benchmarks`, tests are in `src/tests`.

Article about this overview: [link](https://romeerez.hashnode.dev/nodejs-orms-overview-and-comparison)

## Prepare

```sh
npm i # install deps
sudo systemctl start postgresql # make sure you have postgres and it's running
cp .env.example .env # create env file and make sure it has correct db credentials
npm run db create # will create one database for development and second for tests
npm run db migrate # run migrations
```

## Tests

Every endpoint is covered with test, see "scripts" section in package.json to run specific tests, like:

```sh
npm run test:sequelize
```

## Benchmarks

```sh
npm run bench:select # measure selecting articles
npm run bench:insert # measure inserting articles
```


# Additional Information
This project aims to provide a comprehensive comparison of various Node.js ORMs, including Sequelize, TypeORM, and now Drizzle ORM. By running the provided benchmarks and tests, you can evaluate the performance and ease of use of each ORM in a real-world scenario.