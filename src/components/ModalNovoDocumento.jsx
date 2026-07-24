import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Upload } from 'lucide-react';

export default function ModalNovoDocumento({ setores, onFechar, onSucesso }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [setorId, setSetorId] = useState('');
  const [isAtualizado, setIsAtualizado] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function handleEnviar(e) {
    e.preventDefault();
    if (!arquivo) {
      alert('Por favor, selecione um arquivo.');
      return;
    }

    setEnviando(true);

    try {
      const nomeLimpo = arquivo.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');

      const fileName = `${Date.now()}_${nomeLimpo}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Erro no Storage: ' + uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      const arquivoUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('documentos')
        .insert([
          {
            titulo,
            descricao,
            setor_id: setorId || null,
            is_atualizado: isAtualizado,
            arquivo_path: filePath,
            arquivo_url: arquivoUrl
          }
        ]);

      if (dbError) {
        throw new Error('Erro na Tabela: ' + dbError.message);
      }

      alert('Documento cadastrado com sucesso!');
      onSucesso();
    } catch (error) {
      alert('Erro ao fazer upload: ' + error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-[#8B265E] font-bold">
            <Upload className="w-5 h-5" />
            <span>Enviar Novo Documento</span>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleEnviar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Título do Documento</label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#8B265E] outline-none"
              placeholder="Ex: Guia de Orientação Alto Custo"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição Breve</label>
            <textarea
              rows="2"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#8B265E] outline-none"
              placeholder="Ex: Atualização dos protocolos de medicamentos..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tema / Subpasta</label>
            <select
              required
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#8B265E] outline-none"
            >
              <option value="">-- Selecione uma Pasta --</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.parent_id ? `↳ ${s.nome}` : s.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Arquivo (PDF, DOCX, XLSX, etc.)</label>
            <input
              type="file"
              required
              onChange={(e) => setArquivo(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FCE7F3] file:text-[#8B265E] hover:file:bg-[#FBCFE8] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="atualizado"
              checked={isAtualizado}
              onChange={(e) => setIsAtualizado(e.target.checked)}
              className="rounded text-[#8B265E] focus:ring-[#8B265E] w-4 h-4"
            />
            <label htmlFor="atualizado" className="text-xs font-medium text-gray-700 select-none">
              Marcar com selo de <strong className="text-amber-600">"Atualizado"</strong>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 bg-[#8B265E] hover:bg-[#6D1E4A] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              {enviando ? 'Enviando...' : 'Salvar e Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}