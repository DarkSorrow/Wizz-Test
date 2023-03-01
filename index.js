const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const { Sequelize } = require('./models');

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => db.Game.findAll()
  .then(games => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

const getData = async (url) => {
  let response = await fetch(url, {
    method: 'GET',
  })
  let data = await response.json();
  let insert = [];
  for (let i = 0; i < data.length; i++) {
    insert.push({
      publisherId: data[i][0].publisher_id,
      name: data[i][0].name,
      platform: data[i][0].os,
      //storeId: data[i],
      bundleId: data[i][0].bundle_id,
      appVersion: data[i][0].version,
      isPublished: (new Date(data[i][0].release_date) < new Date()),
    });
    if (i % 20 === 0) {
      const result = await db.Game.bulkCreate(insert);
      console.log(result);
      insert = [];
    }
    
    
    /*
    publisherId: DataTypes.STRING,
    name: DataTypes.STRING, // hope this has an index :D
    platform: DataTypes.STRING,
    storeId: DataTypes.STRING,
    bundleId: DataTypes.STRING,
    appVersion: DataTypes.STRING,
    isPublished: DataTypes.BOOLEAN,
    */
   
    
  }

  return true
}

app.get('/api/games/populate', async (req, res) => {
  console.log('im in search api sdf')
  try {
    const android = await getData('https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json');
    const ios = await getData('https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json');
    return res.send({
      inserted: {
        android,
        ios,
      } 
    });
  } catch (err) {
    console.log('error', err)
    return res.status(500).send(err);
  }
});

app.post('/api/games/search', async (req, res) => {
  const { platform, name } = req.body;
  try {
    const where = {};
    if (name && typeof name === 'string') {
      // the doc doesn't mention sql injection using that?
      where[db.Sequelize.Op.and] = [
        db.Sequelize.where(Sequelize.fn('lower', Sequelize.col('name')), 'LIKE', `%${name.toLowerCase()}%`)
      ];
    }
    if (platform && ['ios', 'android'].includes(platform)) {
      where.platform = platform;
    }
    //findAndCountAll
    const games = await db.Game.findAll({
      where
    });
    return res.send(games);
  } catch (err) {
    console.log('error', err)
    return res.status(500).send(err);
  }
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then(game => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});


app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
