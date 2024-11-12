import express from 'express'
import sql from 'mssql'
import {sqlConfig} from "./database.js"
const pool = new sql.ConnectionPool(sqlConfig);

await pool.connect();

const router = express.Router();


 //Rota de Login Atualizada para a possibilidade do Soft Delete
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (email != null && email !== "" && senha != null && senha !== "") {
            const { recordset } = await pool.query`
                SELECT id, email, avatarId FROM usuario 
                WHERE email = ${email} 
                AND senha = ${senha} 
                AND is_deleted = 0`; // Verifica se o usuário não está deletado

            if (recordset.length === 0) {
                return res.status(401).json('Usuário ou senha incorreta');
            }

            return res.status(200).json(recordset);
        }
        return res.status(400).json("Bad request");
    } catch (error) {
        console.log(error);
        return res.status(500).json('Error on server!');
    }
});


// rota de cadastro
router.post('/user/novo', async(req, res)=>{
    try{
        const {email, senha} = req.body;
        console.log(email, senha)
        if(email != null && email != "" && senha != null && senha != ""){
            // Verifica se o email já está cadastrado
            const userExists = await pool.query`SELECT * FROM usuario WHERE email = ${email} AND is_deleted = 0`;
            
            if (userExists.recordset.length > 0) {
                return res.status(409).json('Email já cadastrado!');
            }

            // Insere o novo usuário se o email não estiver cadastrado
            await pool.query`INSERT INTO usuario (email, senha) VALUES (${email}, ${senha})`;
            return res.status(200).json('Cadastrado com sucesso');
        }
        return res.status(400).json("bad request"); 
    }
    catch(error){
        //2627 é o code number padrão no SQL Server para violação de
        //registro unico, nesse caso a pessoa esta tentando inserir um email ja cadastrado
        if(error.number == 2627)
        {
            return res.status(409).json('Email ja cadastrado!');
        }
        return res.status(500).json('Error on server!');
    }
});


// Rota de soft delete
router.delete('/user/:id', async (req, res) => {
    try {
        const { id } = req.params; // O ID é extraído da URL
        
        // Verifica se o usuário existe
        const userExists = await pool.query`SELECT * FROM usuario WHERE id = ${id} AND is_deleted = 0`;
        
        if (userExists.recordset.length === 0) {
            return res.status(404).json('Usuário não encontrado ou já deletado.');
        }

        // Atualiza o usuário para marcar como deletado
        await pool.query`UPDATE usuario SET is_deleted = 1 WHERE id = ${id}`;
        return res.status(200).json('Usuário deletado com sucesso.');
    } catch (error) {
        console.log(error);
        return res.status(500).json('Error on server!');
    }
});


//avatar
router.put('/user/avatar', async (req, res) => {
    try {
        const { userId, avatarId } = req.body;
        
        if (!userId || !avatarId) {
            return res.status(400).json("Bad request: Missing userId or avatarId");
        }

        const avatarExists = await pool.query`SELECT * FROM avatar WHERE avatarId = ${avatarId}`;
        
        if (avatarExists.recordset && avatarExists.recordset.length === 0) {
            return res.status(404).json('Avatar não encontrado');
        }

        const userExists = await pool.query`SELECT * FROM usuario WHERE id = ${userId}`; 
        if (userExists.recordset && userExists.recordset.length === 0) {
            return res.status(404).json('Usuário não encontrado');
        }

        await pool.query`UPDATE usuario SET avatarId = ${avatarId} WHERE id = ${userId}`;
        
        return res.status(200).json('Avatar atualizado com sucesso');
    } catch (error) {
        return res.status(500).json('Erro no servidor ao atualizar o avatar');
    }
});


//provas
router.get('/provas/:id', async (req, res) => {
    try {
        const { id } = req.params; // Obter parâmetros do corpo da requisição

        const { recordset } = await pool.query`SELECT * FROM provas WHERE id = ${id}`;
        
        if (recordset.length === 0) {
            return res.status(404).json('Nenhuma prova encontrada para os parâmetros fornecidos');
        }

        return res.status(200).json(recordset);
    } catch (error) {
        console.error(error);
        return res.status(500).json('Erro no servidor ao buscar provas');
    }
});



router.post('/media', async (req, res) => {
    let { redacao, cienciasNatureza, cienciasHumanas, linguagens, matematica, pesoreda, pesonatu, pesohuma, pesoling, pesomat, usuario_id } = req.body;
   
    try {
        redacao = redacao * pesoreda;
        cienciasNatureza = cienciasNatureza * pesonatu;
        cienciasHumanas = cienciasHumanas * pesohuma;
        linguagens = linguagens * pesoling;
        matematica = matematica * pesomat;

        let somanota = redacao + cienciasNatureza + cienciasHumanas + linguagens + matematica;
        
        let somapeso = parseFloat(pesoreda) + parseFloat(pesonatu) + parseFloat(pesohuma) + parseFloat(pesoling) + parseFloat(pesomat);
        
        const title = Math.round((somanota / somapeso) * 100) / 100;
       
        const usuario = await pool.query`SELECT * FROM media WHERE usuario_id = ${usuario_id}`;
        if (usuario.length === 0) {
            return res.status(404).json('Nenhum usuário encontrado para os parâmetros fornecidos');
        }

        // Salvar o valor calculado na tabela 'media' para o usuário
        await pool.query`INSERT INTO media (usuario_id, media_final) VALUES (${usuario_id}, ${title})`;
        return res.status(200).json(title)
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro ao calcular a média e salvar no banco de dados' });
    }
});

export default router
