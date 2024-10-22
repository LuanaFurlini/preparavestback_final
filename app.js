import express from 'express'
import cors from 'cors'
import router from './routes.js';

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(router)

app.listen(3000,()=>{ console.log('Api ligada!') });