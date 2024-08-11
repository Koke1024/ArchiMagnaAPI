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

function CheckRequireParam(req, require){
  let params = req.body.length > 0 ? req.body: req.query;
  console.log(params)
  console.log(req.body)
  console.log(req.query)
  return new Promise((resolve, reject) => {
    require.forEach(r => {
      if(r in params){
        console.log(`${r}はあるよ${params[r]}`)
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
  res.end();
})

app.get('/user/list', (req, res) => {
  CheckRequireParam(req, ["ROOM_ID"]).catch(e => {
    console.log(e.toString())
  })
  console.log(req.query.ROOM_ID)
  knex('USER_TBL').select("*").where({ROOM_ID: req.query.ROOM_ID})
    .then(rows => {
      res.json(rows);
      res.end();
    })
});

app.get('/user/info', (req, res) => {
  CheckRequireParam(req, ["USER_ID", "TOKEN"]).catch(e => {
    console.log(e.toString())
  })
  knex('USER_TBL').select("*").where({USER_ID: req.query.USER_ID, TOKEN: req.query.TOKEN})
    .then(rows => {
      res.json(rows);
      res.end();
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
        res.end();
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
          res.end();
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
      res.end();
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
          res.end()
        })
      })
    })
  })
})