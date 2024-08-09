//expressモジュールの読み込み
const express = require('express')
const cors = require('cors');

//expressのインスタンス化
const app = express()
app.use(cors())
// JSON形式のデータを扱う場合
app.use(express.json());

// URLエンコードされたデータを扱う場合
app.use(express.urlencoded({ extended: true }));

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

//GETリクエストの設定
//'/get'でアクセスされた時に、JSONとログを出力するようにする
app.get('/', (req, res)=> {
  res.json({ "pet": "dog"});
  res.end();
})

app.get('/user/list', (req, res) => {
  knex('USER_TBL').select("*")
    .then(rows => {
      res.json(rows);
      res.end();
    })
});

app.post('/user/add', (req, res) => {
  console.log(req.body);
  knex('USER_TBL').insert({USER_NAME: req.body.USER_NAME}).then(_ => {
    knex('USER_TBL').select("*")
      .then(rows => {
        res.json(rows);
        res.end();
      })
  })

});