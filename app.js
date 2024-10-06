//expressモジュールの読み込み
const express = require('express')
const cors = require('cors');
var morgan = require('morgan');

//expressのインスタンス化
const app = express()
app.use(cors())
// JSON形式のデータを扱う場合
app.use(express.json());
app.use(morgan('combined'));

// URLエンコードされたデータを扱う場合
app.use(express.urlencoded({extended: true}));

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'archi_magna'
  }
});

//8080番ポートでサーバーを待ちの状態にする。
//またサーバーが起動したことがわかるようにログを出力する
app.listen(8080, () => {
  console.log("サーバー起動中");
});

function CheckRequireParam(req, require) {
  let params = Object.keys(req.body).length > 0 ? req.body : req.query;
  console.log("CheckRequireParam")
  console.log(params)
  return new Promise((resolve, reject) => {
    require.forEach(r => {
      if (r in params) {
        console.log(`${r}あり [${params[r]}]`)
        return;
      }
      reject(new Error(`必要なプロパティ[${r}]がありません。`));
    })
    resolve(true);
  })
}

//GETリクエストの設定
//'/get'でアクセスされた時に、JSONとログを出力するようにする
app.get('/', (req, res) => {
  res.json({"pet": "dog"});
})

app.get('/user/list', (req, res) => {
  CheckRequireParam(req, ["ROOM_ID"]).catch(e => {
    console.log(e.toString())
  })
  console.log(req.query.ROOM_ID)
  knex('USER_TBL').select("*").where({ROOM_ID: req.query.ROOM_ID})
    .then(rows => {
      res.json(rows);
    })
});

app.get('/user/info', (req, res) => {
  CheckRequireParam(req, ["USER_ID", "TOKEN"]).catch(e => {
    console.log(e.toString())
  })
  knex('USER_TBL').select("*").where({USER_ID: req.query.USER_ID, TOKEN: req.query.TOKEN})
    .then(rows => {
      res.json(rows);
    })
});

app.post('/user/add', (req, res) => {
  CheckRequireParam(req, ["USER_NAMES", "ROOM_ID"]).catch(e => {
    console.log(e.toString())
  })
  let newColumns = []
  req.body.USER_NAMES.forEach(r => {
    newColumns.push({USER_NAME: r, ROOM_ID: req.body.ROOM_ID});
  })
  knex('USER_TBL').insert(newColumns).then(_ => {
    knex('USER_TBL').select("*").where({ROOM_ID: req.body.ROOM_ID})
      .then(rows => {
        res.json(rows);
      })
  })
})
app.post('/room/create', (req, res) => {
  knex('ROOM_TBL').insert({DAY: 0})
    .then(r => {
      console.log(r)
      knex('ROOM_TBL').select("*").where({ROOM_ID: r[0]})
        .then(rows => {
          res.json(rows[0]);
        })
    })
})
app.get('/room/info', (req, res) => {
  console.log(req.query.TOKEN)
  CheckRequireParam(req, ["TOKEN"]).catch(e => {
    console.log(e.toString())
  })
  knex('ROOM_TBL').select("*").where({TOKEN: req.query.TOKEN})
    .then(rows => {
      res.json(rows);
    })
})
app.get('/room/info_by_user', (req, res) => {
  console.log(req.query.TOKEN)
  console.log(req.query.USER_ID)
  CheckRequireParam(req, ["TOKEN", "USER_ID"]).catch(e => {
    console.log(e.toString())
  })
  knex('ROOM_TBL')
    .whereIn('ROOM_ID', function () {
      this.select('ROOM_ID')
        .from('USER_TBL')
        .where({USER_ID: req.query.USER_ID, TOKEN: req.query.TOKEN});
    })
    .select('*')
  .then(rows => {
    res.json(rows);
  })
})
app.post('/room/assign/auto', async (req, res) => {
  await CheckRequireParam(req, ["ROOM_ID"]);

  const shuffleArray = arr => arr.sort(() => Math.random() - 0.5);

  var team = [[1, 1], [1, 0], [2, 1], [2, 0], [3, 1], [3, 0], [4, 1], [4, 0]];

  var partnerRoleList = [4, 5, 6, 7];

  team = shuffleArray(team);
  partnerRoleList = shuffleArray(partnerRoleList);

  const rows = await knex('USER_TBL').select("USER_ID").where({ROOM_ID: req.body.ROOM_ID});

  if (rows.length !== 8) {
    return res.status(400).json({error: `ルームメンバーが8人でない(${rows.length}人)`});
  }

  console.log(team.join(","));
  console.log(partnerRoleList.join(","));
  const updatePromises = rows.map((row, i) => {
    console.log(`${i}番目：ID:${row.USER_ID} TEAM: ${team[i][0]} isLeader: ${team[i][1]}`)
    var query = knex('USER_TBL')
      .update({TEAM: team[i][0], ROLE: team[i][1] === 1 ? team[i][0] : partnerRoleList.pop()})
      .where({USER_ID: row.USER_ID});
    console.log(query.toQuery());
    return query;
  });

  await Promise.all(updatePromises);
  res.json({success: true});
})

app.post('/room/next', async (req, res) => {
  await CheckRequireParam(req, ["ROOM_ID"]);

  knex('ROOM_TBL')
    .where({ROOM_ID: req.body.ROOM_ID})
    .update({
      PHASE: knex.raw(`
      CASE 
        WHEN PHASE = 5 THEN 0 
        ELSE PHASE + 1 
      END
    `),
      DAY: knex.raw(`
      CASE 
        WHEN PHASE = 5 THEN DAY + 1 
        ELSE DAY 
      END
    `)
    }).then(_ => {
    knex('ROOM_TBL').select("*").where({ROOM_ID: req.body.ROOM_ID})
      .then(rows => {
        res.json(rows);
      })
  })
})

app.post('/truncate', (req, res) => {
  console.log("truncate all!")
  knex('ROOM_TBL').truncate().then(_ => {
    knex('NIGHT_ACTION_TBL').truncate().then(_ => {
      knex('USER_TBL').truncate().then(_ => {
        knex('PLEDGE_TBL').truncate().then(_ => {
          console.log("truncate completed")
          res.json({})
        })
      })
    })
  })
})