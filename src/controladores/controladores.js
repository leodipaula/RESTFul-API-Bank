let { contas, saques, depositos, transferencias } = require('../bancodedados');
const { format } = require('date-fns');
let numeroNovoCliente = 1;

const validarRequisicao = (tipo, valor) => {
    const existente = contas.find(conta => conta.usuario[tipo] === valor);
    return existente ? `Já existe ${tipo} cadastrado com esse número.` : false;
}

const buscarUsuarioPorNumero = (numero) => {
    return contas.find(conta => Number(conta.numero) === Number(numero));
}

const dataEHora = () => {
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
}

const verificarConta = (numero, res) => {
    const clienteExistente = buscarUsuarioPorNumero(numero);
    if (!clienteExistente) {
        return res.status(404).json({ mensagem: 'Não consta usuário com esse número.' });
    }
    return clienteExistente;
}

const listarContas = (req, res) => {
    const { senha_banco } = req.query;

    if (!senha_banco) {
        return res.status(403).json({ mensagem: 'Você não possui permissão para fazer essa requisição.' });
    }

    if (senha_banco !== 'Cubos123Bank') {
        return res.status(401).json({ mensagem: 'A senha do banco está incorreta' });
    }

    return res.status(200).json(contas);
}

const criarConta = (req, res) => {
    const { nome, cpf, data_nascimento, telefone, email, senha } = req.body;

    const camposObrigatorios = ['nome', 'cpf', 'data_nascimento', 'telefone', 'email', 'senha'];

    for (const campo of camposObrigatorios) {
        if (!req.body[campo]) {
            return res.status(400).json({ mensagem: 'O preenchimento de todos os campos são obrigatórios.' });
        }
    }

    const verificacoes = [
        validarRequisicao('cpf', cpf),
        validarRequisicao('telefone', telefone),
        validarRequisicao('email', email)
    ];

    const erroExistente = verificacoes.find(erro => erro !== false);

    if (erroExistente) {
        return res.status(400).json({ mensagem: erroExistente });
    }

    const novaConta = {
        numero: numeroNovoCliente++,
        saldo: 0,
        usuario: { ...req.body }
    };

    contas.push(novaConta);

    return res.status(204).send();
}

const atualizarConta = (req, res) => {
    const { nome, cpf, data_nascimento, telefone, email, senha } = req.body;
    const { numeroConta } = req.params;

    if (!nome || !cpf || !data_nascimento || !telefone || !email || !senha) {
        return res.status(400).json({ mensagem: 'O preenchimento de todos os campos são obrigatórios.' });
    }

    if (isNaN(numeroConta)) {
        return res.status(400).json({ mensagem: 'O número da conta está com formato inválido.' });
    }

    const clienteExistente = verificarConta(numeroConta, res);

    const verificacoes = [
        validarRequisicao('cpf', cpf),
        validarRequisicao('email', email)
    ];

    const erroExistente = verificacoes.find(erro => erro !== false);

    if (erroExistente) {
        return res.status(400).json({ mensagem: erroExistente });
    }

    clienteExistente.usuario.nome = nome;
    clienteExistente.usuario.cpf = cpf;
    clienteExistente.usuario.data_nascimento = data_nascimento;
    clienteExistente.usuario.telefone = telefone;
    clienteExistente.usuario.email = email;
    clienteExistente.usuario.senha = senha;

    return res.status(204).send();
}

const excluirConta = (req, res) => {
    const { numeroConta } = req.params;

    if (isNaN(numeroConta)) {
        return res.status(400).json({ mensagem: 'O número da conta está com formato inválido.' });
    }

    const clienteExistente = verificarConta(numeroConta, res);

    if (clienteExistente.saldo !== 0) {
        return res.status(403).json({ mensagem: 'A conta só pode ser removida se o saldo for zero!' });
    }

    contas = contas.filter(cliente => Number(cliente.numero) !== Number(numeroConta));

    return res.status(200).json({ mensagem: 'Cliente excluído com sucesso' });
}

const depositar = (req, res) => {
    const { numero_conta, valor } = req.body;

    if (!numero_conta || !valor) {
        return res.status(400).json({ mensagem: 'O número da conta e o valor são obrigatórios!' });
    }

    const clienteExistente = verificarConta(numero_conta, res);

    if (valor <= 0) {
        return res.status(400).json({ mensagem: 'O valor a ser depositado precisa ser maior que 0' });
    }

    clienteExistente.saldo += Number(valor);

    const registro = dataEHora();
    const depositoRealizado = {
        data: registro,
        numero_conta,
        valor
    }
    depositos.push(depositoRealizado);

    return res.status(204).send();
}

const sacar = (req, res) => {
    const { numero_conta, senha, valor } = req.body;

    if (!numero_conta || !senha || !valor) {
        return res.status(400).json({ mensagem: 'O número da conta, senha e valor são obrigatórios!' });
    }

    const clienteExistente = verificarConta(numero_conta, res);

    if (clienteExistente.usuario.senha !== senha) {
        return res.status(403).json({ mensagem: 'A senha informada está incorreta.' });
    }

    if (valor <= 0) {
        return res.status(400).json({ mensagem: 'O valor a ser sacado precisa ser maior que 0' });
    }

    if (clienteExistente.saldo < valor) {
        return res.status(400).json({ mensagem: 'Saldo insuficiente para realizar o saque.' });
    }

    clienteExistente.saldo -= valor;

    const registro = dataEHora();
    const saqueRealizado = {
        data: registro,
        numero_conta,
        valor
    }
    saques.push(saqueRealizado);

    return res.status(204).send();
}

const transferir = (req, res) => {
    const { numero_conta_origem, numero_conta_destino, senha, valor } = req.body;

    if (!numero_conta_origem || !numero_conta_destino || !senha || !valor) {
        return res.status(400).json({ mensagem: 'O preenchimento de todos os campos são obrigatórios!' });
    }

    const clienteDeOrigem = verificarConta(numero_conta_origem, res);
    const clienteDestinatario = verificarConta(numero_conta_destino, res);

    if (clienteDeOrigem.usuario.senha !== senha) {
        return res.status(403).json({ mensagem: 'A senha informada está incorreta.' });
    }

    if (valor <= 0) {
        return res.status(400).json({ mensagem: 'O valor a ser transferido precisa ser maior que 0.' });
    }

    if (clienteDeOrigem.saldo < valor) {
        return res.status(400).json({ mensagem: 'Saldo insuficiente para realizar transferência.' });
    }

    clienteDeOrigem.saldo -= valor;
    clienteDestinatario.saldo += valor;

    const registro = dataEHora();
    const transferenciaRealizada = {
        data: registro,
        numero_conta_origem,
        numero_conta_destino,
        valor
    }
    transferencias.push(transferenciaRealizada);

    return res.status(204).send();
}

const saldo = (req, res) => {
    const { numero_conta, senha } = req.query;

    if (!numero_conta || !senha) {
        return res.status(400).json({ mensagem: 'O número da conta e a senha são obrigatórios!' });
    }

    const clienteExistente = verificarConta(numero_conta, res);

    if (clienteExistente.usuario.senha !== senha) {
        return res.status(403).json({ mensagem: 'A senha informada está incorreta.' });
    }

    return res.status(200).json({ saldo: clienteExistente.saldo });
}

const extrato = (req, res) => {
    const { numero_conta, senha } = req.query;

    if (!numero_conta || !senha) {
        return res.status(400).json({ mensagem: 'O número da conta e a senha são obrigatórios!' });
    }

    verificarConta(numero_conta, res);

    const transacoes = {
        depositos: [],
        saques: [],
        transferenciasEnviadas: [],
        transferenciasRecebidas: [],
    };

    transacoes.depositos = depositos.filter(transacao => transacao.numero_conta === numero_conta);
    transacoes.saques = saques.filter(transacao => transacao.numero_conta === numero_conta);
    transacoes.transferenciasEnviadas = transferencias.filter(transacao => transacao.numero_conta_origem === numero_conta);
    transacoes.transferenciasRecebidas = transferencias.filter(transacao => transacao.numero_conta_destino === numero_conta);

    return res.status(200).json({ transacoes });
}

module.exports = {
    listarContas,
    criarConta,
    atualizarConta,
    excluirConta,
    depositar,
    sacar,
    transferir,
    saldo,
    extrato
};