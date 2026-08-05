import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './components/login';
import ModalNovoDocumento from './components/ModalNovoDocumento';
import ModalNovoSetor from './components/ModalNovoSetor';
import ModalEditarSetor from './components/ModalEditarSetor';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  FileText, Search, Lock, Download, Bell, LogOut, Plus, Edit2, Trash2, Eye, FileSpreadsheet,
  Megaphone, Calendar, AlertTriangle, X, Maximize2, ShieldCheck, UserCheck, Key
} from 'lucide-react';

export default function App() {
  const [setores, setSetores] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [avisos, setAvisos] = useState([]);
  
  const [setorSelecionado, setSetorSelecionado] = useState(null);
  const [temasAbertos, setTemasAbertos] = useState({});
  const [busca, setBusca] = useState('');
  
  // Controle de Abas: 'documentos' ou 'avisos'
  const [abaAtiva, setAbaAtiva] = useState('documentos');

  // Controle de Autenticação e Perfis
  const [autenticado, setAutenticado] = useState(false); // Bloqueia acesso sem login
  const [perfilAcesso, setPerfilAcesso] = useState('leitor'); // 'leitor' ou 'admin'
  const [usuarioAdmin, setUsuarioAdmin] = useState(null);
  const [telaLoginAdmin, setTelaLoginAdmin] = useState(false);

  // Form de Login do Leitor Geral
  const [senhaLeitor, setSenhaLeitor] = useState('');
  const [erroLoginLeitor, setErroLoginLeitor] = useState('');

  // Modais
  const [modalDocAberto, setModalDocAberto] = useState(false);
  const [modalSetorAberto, setModalSetorAberto] = useState(false);
  const [setorParaEditar, setSetorParaEditar] = useState(null);
  const [modalAvisoAberto, setModalAvisoAberto] = useState(false);

  // Modal para Ampliar Aviso (Lightbox)
  const [avisoAmpliado, setAvisoAmpliado] = useState(null);

  // Form de Novo Aviso
  const [novoAvisoTitulo, setNovoAvisoTitulo] = useState('');
  const [novoAvisoDesc, setNovoAvisoDesc] = useState('');
  const [novoAvisoImagem, setNovoAvisoImagem] = useState(null);
  const [enviandoAviso, setEnviandoAviso] = useState(false);

  useEffect(() => {
    carregarSetores();
    carregarDocumentos();
    carregarAvisos();

    // Verifica sessão prévia de Administrador via Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUsuarioAdmin(session.user);
        setPerfilAcesso('admin');
        setAutenticado(true);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsuarioAdmin(session.user);
        setPerfilAcesso('admin');
        setAutenticado(true);
      } else if (perfilAcesso === 'admin') {
        setUsuarioAdmin(null);
        setPerfilAcesso('leitor');
        setAutenticado(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function carregarSetores() {
    const { data } = await supabase.from('setores').select('*').order('nome');
    if (data) setSetores(data);
  }

  async function carregarDocumentos() {
    const { data } = await supabase.from('documentos').select('*').order('created_at', { ascending: false });
    if (data) setDocumentos(data);
  }

  async function carregarAvisos() {
    const { data } = await supabase.from('avisos').select('*').order('created_at', { ascending: false });
    if (data) setAvisos(data);
  }

  // Validação do Login do Usuário Geral (Leitura)
  function handleLoginLeitor(e) {
    e.preventDefault();
    const SENHA_CORRETA_LEITOR = "SAude_@2026"; // Altere aqui a senha padrão se desejar

    if (senhaLeitor === SENHA_CORRETA_LEITOR) {
      setAutenticado(true);
      setPerfilAcesso('leitor');
      setErroLoginLeitor('');
    } else {
      setErroLoginLeitor('Senha incorreta. Verifique com a administração.');
    }
  }

  async function handleLogout() {
    if (perfilAcesso === 'admin') {
      await supabase.auth.signOut();
    }
    setUsuarioAdmin(null);
    setPerfilAcesso('leitor');
    setAutenticado(false);
    setSenhaLeitor('');
  }

  async function handleExcluirSetor(setor) {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir o tema "${setor.nome}"?\n\nAtenção: Se for um tema principal, todas as subpastas também serão removidas.`
    );
    if (!confirmacao) return;

    const { error } = await supabase.from('setores').delete().eq('id', setor.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      if (setorSelecionado === setor.id) setSetorSelecionado(null);
      carregarSetores();
    }
  }

  async function handleExcluirDocumento(doc) {
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o documento "${doc.titulo}"?`);
    if (!confirmacao) return;

    const { error } = await supabase.from('documentos').delete().eq('id', doc.id);
    if (error) {
      alert('Erro ao excluir documento: ' + error.message);
    } else {
      carregarDocumentos();
    }
  }

  async function handleSalvarAviso(e) {
    e.preventDefault();
    if (!novoAvisoTitulo.trim()) return alert('Informe o título do aviso.');

    setEnviandoAviso(true);
    let imagem_url = null;

    try {
      if (novoAvisoImagem) {
        const fileExt = novoAvisoImagem.name.split('.').pop();
        const fileName = `aviso_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, novoAvisoImagem);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documentos')
          .getPublicUrl(fileName);

        imagem_url = urlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('avisos').insert([
        { 
          titulo: novoAvisoTitulo, 
          descricao: novoAvisoDesc, 
          imagem_url 
        }
      ]);

      if (dbError) throw dbError;

      setNovoAvisoTitulo('');
      setNovoAvisoDesc('');
      setNovoAvisoImagem(null);
      setModalAvisoAberto(false);
      carregarAvisos();
    } catch (err) {
      alert('Erro ao salvar aviso: ' + err.message);
    } finally {
      setEnviandoAviso(false);
    }
  }

  async function handleExcluirAviso(aviso) {
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o comunicado "${aviso.titulo}"?`);
    if (!confirmacao) return;

    const { error } = await supabase.from('avisos').delete().eq('id', aviso.id);
    if (error) {
      alert('Erro ao excluir aviso: ' + error.message);
    } else {
      if (avisoAmpliado?.id === aviso.id) setAvisoAmpliado(null);
      carregarAvisos();
    }
  }

  const toggleTema = (id) => {
    setTemasAbertos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const temasPrincipais = setores.filter(s => !s.parent_id);
  const obterSubpastas = (parentId) => setores.filter(s => s.parent_id === parentId);

  const documentosFiltrados = documentos.filter(doc => {
    const bateuBusca = doc.titulo.toLowerCase().includes(busca.toLowerCase());
    const bateuSetor = setorSelecionado ? doc.setor_id === setorSelecionado : true;
    return bateuBusca && bateuSetor;
  });

  // TELA DE LOGIN DE ADMINISTRADOR
  if (telaLoginAdmin) {
    return (
      <Login 
        onVoltar={() => setTelaLoginAdmin(false)} 
        onLoginSucesso={() => {
          setTelaLoginAdmin(false);
          setAutenticado(true);
          setPerfilAcesso('admin');
        }} 
      />
    );
  }

  // TELA DE BLOQUEIO / USUÁRIO GERAL (EXIGE SENHA PARA VISUALIZAR)
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative font-sans">
        <div 
          className="fixed inset-0 pointer-events-none opacity-5 bg-center bg-no-repeat bg-contain"
          style={{ backgroundImage: `url('/brasao.png')` }}
        />
        
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full z-10 border border-gray-200 text-center">
          <div className="bg-[#8B265E]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#8B265E]" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">Portal de Documentos</h2>
          <p className="text-xs text-gray-500 mb-6">Secretaria Municipal de Saúde - Jarinu</p>

          <form onSubmit={handleLoginLeitor} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#8B265E]" /> Senha de Acesso Geral
              </label>
              <input
                type="password"
                required
                placeholder="Digite a senha de acesso..."
                value={senhaLeitor}
                onChange={(e) => setSenhaLeitor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B265E]"
              />
            </div>

            {erroLoginLeitor && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{erroLoginLeitor}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#8B265E] hover:bg-[#6D1E4A] text-white font-semibold py-2.5 rounded-lg text-sm shadow transition"
            >
              Acessar Documentos
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setTelaLoginAdmin(true)}
              className="text-xs text-[#8B265E] hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
            >
              <ShieldCheck className="w-4 h-4" /> Entrar como Administrador
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = perfilAcesso === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* MARCA D'ÁGUA DE FUNDO */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-center bg-no-repeat bg-contain opacity-[0.03]"
        style={{ backgroundImage: `url('/brasao.png')`, backgroundPosition: '60% center', backgroundSize: '450px' }}
      />

      {/* CABEÇALHO */}
      <header className="bg-[#8B265E] text-white p-4 shadow-md flex justify-between items-center z-10 border-b-2 border-[#A855F7]/30">
        <div className="flex items-center space-x-4">
          <div className="bg-white/95 p-1.5 rounded-lg shadow-sm flex items-center justify-center">
            <img 
              src="/brasao.png" 
              alt="Brasão Secretaria de Saúde" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">SECRETARIA MUNICIPAL DE SAÚDE</h1>
            <p className="text-xs text-[#E9D5FF] font-medium tracking-wide">PREFEITURA MUNICIPAL DE JARINU</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <span className="text-xs bg-black/20 px-3 py-1.5 rounded-full border border-white/10 text-white/90 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> Admin: {usuarioAdmin?.email || 'Administrador'}
            </span>
          ) : (
            <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full text-white/90 flex items-center gap-1.5 border border-white/10">
              <UserCheck className="w-3.5 h-3.5 text-pink-300" /> Usuário Geral (Leitura)
            </span>
          )}

          {!isAdmin && (
            <button
              onClick={() => setTelaLoginAdmin(true)}
              className="text-xs bg-[#6D1E4A] hover:bg-[#521637] text-white px-3 py-1.5 rounded-lg font-semibold border border-white/10 transition"
            >
              Área Admin
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-[#521637] hover:bg-[#3B1028] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition border border-white/10 shadow-sm"
            title="Sair do sistema"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 z-10">
        {/* SIDEBAR */}
        <aside className="w-80 bg-white/90 backdrop-blur-sm border-r border-gray-200 p-4 flex flex-col justify-between flex-shrink-0">
          <div>
            {/* BOTÃO PAINEL DE AVISOS */}
            <button
              onClick={() => { setAbaAtiva('avisos'); setSetorSelecionado(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold text-sm mb-4 flex items-center justify-between transition-all duration-200 border ${
                abaAtiva === 'avisos'
                  ? 'bg-[#8B265E] text-white border-[#8B265E] shadow-sm'
                  : 'bg-[#FCE7F3] text-[#8B265E] border-[#FCE7F3] hover:bg-[#8B265E] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                <span>PAINEL DE AVISOS</span>
              </div>
              {avisos.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  abaAtiva === 'avisos' ? 'bg-white text-[#8B265E]' : 'bg-[#8B265E] text-white'
                }`}>
                  {avisos.length}
                </span>
              )}
            </button>

            <div className="flex justify-between items-center mb-2 pt-2 border-t border-gray-100">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Temas Principais</h2>
              {isAdmin && (
                <button 
                  onClick={() => setModalSetorAberto(true)}
                  className="text-xs bg-[#FCE7F3] text-[#8B265E] hover:bg-[#8B265E] hover:text-white p-1.5 rounded-md flex items-center gap-1 font-semibold transition duration-200"
                  title="Criar Tema ou Subpasta"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo Tema
                </button>
              )}
            </div>
            
            {/* BOTÃO TODOS OS DOCUMENTOS */}
            <button 
              onClick={() => { setAbaAtiva('documentos'); setSetorSelecionado(null); }}
              className={`w-full text-left px-3 py-2 rounded-md font-medium text-sm mb-3 flex items-center gap-2 transition-all duration-200 ${
                abaAtiva === 'documentos' && !setorSelecionado 
                  ? 'bg-[#8B265E] text-white font-semibold shadow-sm' 
                  : 'text-gray-700 hover:bg-[#FCE7F3] hover:text-[#8B265E]'
              }`}
            >
              <Folder className={`w-4 h-4 ${abaAtiva === 'documentos' && !setorSelecionado ? 'text-white' : 'text-[#8B265E]'}`} /> 
              Todos os Documentos
            </button>

            {/* ÁRVORE DE TEMAS */}
            <nav className="space-y-1">
              {temasPrincipais.map(tema => {
                const subpastas = obterSubpastas(tema.id);
                const temSubpastas = subpastas.length > 0;
                const estaAberto = temasAbertos[tema.id];
                const estaSelecionado = abaAtiva === 'documentos' && setorSelecionado === tema.id;

                return (
                  <div key={tema.id} className="space-y-1">
                    <div 
                      className={`group flex items-center justify-between rounded-md text-sm font-medium transition-all duration-200 ${
                        estaSelecionado 
                          ? 'bg-[#8B265E] text-white font-semibold shadow-sm' 
                          : 'text-gray-700 hover:bg-[#FCE7F3] hover:text-[#8B265E]'
                      }`}
                    >
                      <button
                        onClick={() => { setAbaAtiva('documentos'); setSetorSelecionado(tema.id); }}
                        className="flex-1 text-left px-3 py-2 flex items-center gap-2 truncate"
                      >
                        {estaAberto ? (
                          <FolderOpen className={`w-4 h-4 shrink-0 ${estaSelecionado ? 'text-white' : 'text-[#8B265E]'}`} />
                        ) : (
                          <Folder className={`w-4 h-4 shrink-0 ${estaSelecionado ? 'text-white' : 'text-gray-400 group-hover:text-[#8B265E]'}`} />
                        )}
                        <span className="truncate">{tema.nome}</span>
                      </button>

                      <div className="flex items-center pr-1">
                        {isAdmin && (
                          <div className="hidden group-hover:flex items-center gap-0.5 mr-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSetorParaEditar(tema); }} 
                              className="p-1 hover:text-white rounded" 
                              title="Editar Tema"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleExcluirSetor(tema); }} 
                              className="p-1 hover:text-red-200 rounded" 
                              title="Excluir Tema"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {temSubpastas && (
                          <button 
                            onClick={() => toggleTema(tema.id)} 
                            className={`p-1.5 ${estaSelecionado ? 'text-white' : 'text-gray-400 hover:text-[#8B265E]'}`}
                          >
                            {estaAberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {estaAberto && temSubpastas && (
                      <div className="pl-6 space-y-1 border-l-2 border-[#FCE7F3] ml-4">
                        {subpastas.map(sub => {
                          const subSelecionada = abaAtiva === 'documentos' && setorSelecionado === sub.id;
                          return (
                            <div 
                              key={sub.id} 
                              className={`group flex items-center justify-between rounded-md text-xs font-medium transition-all duration-200 ${
                                subSelecionada 
                                  ? 'bg-[#8B265E] text-white font-bold' 
                                  : 'text-gray-600 hover:bg-[#FCE7F3] hover:text-[#8B265E]'
                              }`}
                            >
                              <button
                                onClick={() => { setAbaAtiva('documentos'); setSetorSelecionado(sub.id); }}
                                className="flex-1 text-left px-3 py-1.5 flex items-center gap-2 truncate"
                              >
                                <Folder className={`w-3.5 h-3.5 shrink-0 ${subSelecionada ? 'text-white' : 'text-gray-400 group-hover:text-[#8B265E]'}`} />
                                <span className="truncate">{sub.nome}</span>
                              </button>

                              {isAdmin && (
                                <div className="hidden group-hover:flex items-center gap-0.5 pr-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setSetorParaEditar(sub); }} 
                                    className="p-1 hover:text-white rounded" 
                                    title="Editar Subpasta"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleExcluirSetor(sub); }} 
                                    className="p-1 hover:text-red-200 rounded" 
                                    title="Excluir Subpasta"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* MODELO PADRÃO */}
          <div className="pt-4 border-t border-gray-200 mt-6">
            <a 
              href="/Modelo_Documento_Oficial_Jarinu.docx" 
              download
              className="w-full bg-[#F3E8FF] hover:bg-[#E9D5FF] border border-[#E9D5FF] text-[#6B21A8] p-3 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-sm group"
            >
              <FileSpreadsheet className="w-5 h-5 text-[#8B265E] shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="block font-bold">Baixar Modelo Padrão</span>
                <span className="text-[10px] text-[#7E22CE] font-normal">Arquivo timbrado para edições</span>
              </div>
            </a>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 p-6">
          
          {/* TELA DE AVISOS */}
          {abaAtiva === 'avisos' ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Megaphone className="w-6 h-6 text-[#8B265E]" /> Painel de Avisos & Comunicados
                  </h2>
                  <p className="text-xs text-gray-500">Informativos oficiais da Secretaria Municipal de Saúde (Clique no aviso para ampliar)</p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setModalAvisoAberto(true)}
                    className="bg-[#8B265E] hover:bg-[#6D1E4A] text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow transition"
                  >
                    <Plus className="w-4 h-4" /> Publicar Novo Aviso
                  </button>
                )}
              </div>

              {avisos.length === 0 ? (
                <div className="bg-white/80 rounded-xl p-12 text-center border border-gray-200 shadow-sm">
                  <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium text-sm">Nenhum comunicado publicado até o momento.</p>
                </div>
              ) : (
                /* GRID ESTILIZADO DIRETO VIA CSS INLINE (GARANTE CARDS LADO A LADO) */
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '1.5rem',
                    width: '100%' 
                  }}
                >
                  {avisos.map((aviso) => (
                    <div 
                      key={aviso.id} 
                      onClick={() => setAvisoAmpliado(aviso)}
                      className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group cursor-pointer hover:-translate-y-1"
                      style={{ height: '360px' }}
                    >
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExcluirAviso(aviso);
                          }}
                          className="absolute top-3 right-3 bg-red-600/90 text-white p-2 rounded-full shadow hover:bg-red-700 transition z-20"
                          title="Excluir aviso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex-1 flex flex-col overflow-hidden">
                        {aviso.imagem_url ? (
                          <div className="bg-gray-100 border-b border-gray-100 overflow-hidden h-44 w-full flex items-center justify-center relative shrink-0">
                            <img 
                              src={aviso.imagem_url} 
                              alt={aviso.titulo} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                                <Maximize2 className="w-3.5 h-3.5 text-[#8B265E]" /> Clique para ampliar
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#FCE7F3] p-4 text-center border-b border-pink-100 shrink-0">
                            <AlertTriangle className="w-8 h-8 text-[#8B265E] mx-auto mb-1" />
                            <span className="text-[10px] font-bold text-[#8B265E] uppercase tracking-wider">Comunicado Oficial</span>
                          </div>
                        )}

                        <div className="p-4 flex-1 flex flex-col justify-between overflow-hidden">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(aviso.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm mb-1 leading-snug group-hover:text-[#8B265E] transition-colors line-clamp-2">{aviso.titulo}</h3>
                            {aviso.descricao && (
                              <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed line-clamp-2">{aviso.descricao}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 font-semibold shrink-0">
                        <span className="uppercase text-[10px]">Secretaria de Saúde</span>
                        <span className="text-[#8B265E] flex items-center gap-1 text-[11px] group-hover:underline">
                          Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            
            /* TELA DE DOCUMENTOS */
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar documento ou palavra-chave..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B265E] text-sm outline-none bg-white/80"
                  />
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setModalDocAberto(true)}
                    className="w-full md:w-auto bg-[#8B265E] hover:bg-[#6D1E4A] text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 shadow transition"
                  >
                    <Plus className="w-4 h-4" /> Enviar Novo Documento
                  </button>
                )}
              </div>

              {/* TABELA DE DOCUMENTOS */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/60 divide-y divide-gray-200">
                    {documentosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-sm">
                          Nenhum documento encontrado nesta pasta.
                        </td>
                      </tr>
                    ) : (
                      documentosFiltrados.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50/80 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-[#8B265E] mr-3 shrink-0" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{doc.titulo}</div>
                                <div className="text-xs text-gray-500">{doc.descricao}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {doc.is_atualizado && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3E8FF] text-[#6B21A8] gap-1 border border-[#E9D5FF]">
                                <Bell className="w-3 h-3 text-[#8B265E]" /> Atualizado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={doc.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#8B265E] hover:text-white hover:bg-[#8B265E] inline-flex items-center gap-1 font-semibold text-xs bg-[#FCE7F3] px-2.5 py-1.5 rounded-md transition duration-200"
                                title="Visualizar documento em nova aba"
                              >
                                <Eye className="w-3.5 h-3.5" /> Visualizar
                              </a>

                              <a
                                href={doc.arquivo_url}
                                download
                                className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 font-semibold text-xs border border-gray-200 hover:bg-gray-100 px-2.5 py-1.5 rounded-md transition duration-200"
                                title="Baixar arquivo"
                              >
                                <Download className="w-3.5 h-3.5" /> Baixar
                              </a>

                              {isAdmin && (
                                <button
                                  onClick={() => handleExcluirDocumento(doc)}
                                  className="text-gray-400 hover:text-[#8B265E] p-1.5 rounded-md hover:bg-[#FCE7F3] transition"
                                  title="Excluir Documento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </main>
      </div>

      {/* MODAL DE VISUALIZAÇÃO AMPLIADA DO AVISO */}
      {avisoAmpliado && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-6 animate-fadeIn"
          onClick={() => setAvisoAmpliado(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden relative border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setAvisoAmpliado(null)}
              className="absolute top-3 right-3 bg-black/80 text-white hover:bg-black p-2 rounded-full z-20 transition shadow-xl border border-white/20"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex-1 overflow-y-auto bg-gray-950 p-2 flex flex-col items-center">
              {avisoAmpliado.imagem_url ? (
                <img 
                  src={avisoAmpliado.imagem_url} 
                  alt={avisoAmpliado.titulo} 
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              ) : (
                <div className="bg-[#8B265E] p-8 text-center text-white w-full">
                  <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-90" />
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">Comunicado Oficial</span>
                </div>
              )}
            </div>

            <div className="p-4 md:p-5 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <Calendar className="w-4 h-4 text-[#8B265E]" />
                  <span>Publicado em {new Date(avisoAmpliado.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <span className="text-[11px] text-gray-400 uppercase font-semibold">Secretaria de Saúde</span>
              </div>

              <h2 className="text-lg md:text-xl font-bold text-gray-900">{avisoAmpliado.titulo}</h2>

              {avisoAmpliado.descricao && (
                <p className="mt-2 text-xs text-gray-600 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {avisoAmpliado.descricao}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PUBLICAR AVISO */}
      {modalAvisoAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#8B265E]" /> Publicar Novo Aviso
            </h3>

            <form onSubmit={handleSalvarAviso} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título do Comunicado *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: INSTABILIDADE NA INTERNET"
                  value={novoAvisoTitulo}
                  onChange={(e) => setNovoAvisoTitulo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8B265E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição / Detalhes (Opcional)</label>
                <textarea 
                  rows="3"
                  placeholder="Informe orientações aos servidores ou munícipes..."
                  value={novoAvisoDesc}
                  onChange={(e) => setNovoAvisoDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8B265E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Imagem do Banner/Card (Opcional)</label>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNovoAvisoImagem(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FCE7F3] file:text-[#8B265E] hover:file:bg-[#8B265E] hover:file:text-white transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalAvisoAberto(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoAviso}
                  className="px-4 py-2 bg-[#8B265E] hover:bg-[#6D1E4A] text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                >
                  {enviandoAviso ? 'Publicando...' : 'Publicar Aviso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OUTROS MODAIS */}
      {modalSetorAberto && (
        <ModalNovoSetor 
          setores={setores}
          onFechar={() => setModalSetorAberto(false)} 
          onSucesso={() => { carregarSetores(); setModalSetorAberto(false); }} 
        />
      )}

      {setorParaEditar && (
        <ModalEditarSetor 
          setor={setorParaEditar}
          setores={setores}
          onFechar={() => setSetorParaEditar(null)}
          onSucesso={() => { carregarSetores(); setSetorParaEditar(null); }}
        />
      )}

      {modalDocAberto && (
        <ModalNovoDocumento 
          setores={setores} 
          onFechar={() => setModalDocAberto(false)} 
          onSucesso={() => { carregarDocumentos(); setModalDocAberto(false); }} 
        />
      )}
    </div>
  );
}