import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Edit3 } from 'lucide-react';

export default function ModalEditarSetor({ setor, setores, onFechar, onSucesso }) {
  const [nome, setNome] = useState(setor.nome);
  const [parentId, setParentId] = useState(setor.parent_id || '');
  const [salvando, setSalvando] = useState(false);

  // Impede que o próprio setor seja pai dele mesmo
  const temasPrincipais = setores.filter(s => !s.parent_id && s.id !== setor.id);

  async function handleSalvar(e) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase
      .from('setores')
      .update({ 
        nome, 
        parent_id: parentId ? parentId : null 
      })
      .eq('id', setor.id);

    if (error) {
      alert('Erro ao atualizar tema/subpasta: ' + error.message);
    } else {
      onSucesso();
    }
    setSalvando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-blue-800 font-bold">
            <Edit3 className="w-5 h-5" />
            <span>Editar Tema / Subpasta</span>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome da Pasta</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Pertence a qual Tema Principal?</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- É um Tema Principal (Pasta Raíz) --</option>
              {temasPrincipais.map(t => (
                <option key={t.id} value={t.id}>Subpasta de: {t.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}