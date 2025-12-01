// src/pages/CreateContainerModal.jsx
import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'; // ← FIXED: Added useQuery
import { dockerApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

const CreateContainerModal = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    image: '',
    env: [{ key: '', value: '' }],
    ports: [{ host: '', container: '' }],
    volumes: [{ host: '', container: '' }],
    networks: [],
    restartPolicy: 'no'
  });

  // ← This was the missing import causing the error
  const { data: networks = [] } = useQuery({
    queryKey: ['networks'],
    queryFn: () => dockerApi.getNetworks().then(r => r.data),
    enabled: isOpen
  });

  const mutation = useMutation({
    mutationFn: dockerApi.createContainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      onClose();
    }
  });

  const addField = (type) => {
    setForm(prev => ({
      ...prev,
      [type]: [...prev[type], type === 'env' ? { key: '', value: '' } : { host: '', container: '' }]
    }));
  };

  const updateField = (type, index, field, value) => {
    setForm(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removeField = (type, index) => {
    setForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name || undefined,
      image: form.image,
      env: form.env.filter(e => e.key).map(e => `${e.key}=${e.value}`),
      cmd: [],
      ports: form.ports.filter(p => p.host && p.container).map(p => ({
        host: parseInt(p.host),
        container: parseInt(p.container)
      })),
      volumes: form.volumes.filter(v => v.host && v.container).map(v => ({
        host: v.host,
        container: v.container
      })),
      networks: form.networks,
      restartPolicy: form.restartPolicy
    };
    mutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-screen overflow-y-auto rounded-2xl ${isDark ? 'bg-ocean-900' : 'bg-white'} p-8`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-ocean-900'}`}>
            Create New Container
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800/50 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <input
            placeholder="Container name (optional)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-ocean-800 border-ocean-700' : 'bg-gray-50 border-gray-300'}`}
          />
          <input
            placeholder="Image name (e.g. nginx:latest)"
            value={form.image}
            onChange={e => setForm({ ...form, image: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-ocean-800 border-ocean-700' : 'bg-gray-50 border-gray-300'}`}
          />

          {/* Environment Variables */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Environment Variables</h3>
            {form.env.map((env, i) => (
              <div key={i} className="flex gap-3 mb-2">
                <input placeholder="KEY" value={env.key} onChange={e => updateField('env', i, 'key', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border" />
                <input placeholder="VALUE" value={env.value} onChange={e => updateField('env', i, 'value', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border" />
                <button onClick={() => removeField('env', i)} className="p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
            <button onClick={() => addField('env')} className="text-sm text-seafoam-500 flex items-center gap-1 mt-2">
              <Plus className="w-4 h-4" /> Add Environment Variable
            </button>
          </div>

          {/* Ports */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Port Mappings</h3>
            {form.ports.map((port, i) => (
              <div key={i} className="flex gap-3 mb-2">
                <input placeholder="Host Port" value={port.host} onChange={e => updateField('ports', i, 'host', e.target.value)} className="w-32 px-3 py-2 rounded-lg border" />
                <span className="self-center">→</span>
                <input placeholder="Container Port" value={port.container} onChange={e => updateField('ports', i, 'container', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border" />
                <button onClick={() => removeField('ports', i)} className="p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
            <button onClick={() => addField('ports')} className="text-sm text-seafoam-500 flex items-center gap-1 mt-2">
              <Plus className="w-4 h-4" /> Add Port Mapping
            </button>
          </div>

          {/* Volumes */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Volume Mounts</h3>
            {form.volumes.map((vol, i) => (
              <div key={i} className="flex gap-3 mb-2">
                <input placeholder="Host Path" value={vol.host} onChange={e => updateField('volumes', i, 'host', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border" />
                <span className="self-center">→</span>
                <input placeholder="Container Path" value={vol.container} onChange={e => updateField('volumes', i, 'container', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border" />
                <button onClick={() => removeField('volumes', i)} className="p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
            <button onClick={() => addField('volumes')} className="text-sm text-seafoam-500 flex items-center gap-1 mt-2">
              <Plus className="w-4 h-4" /> Add Volume Mount
            </button>
          </div>

          {/* Networks & Restart Policy */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Networks</h3>
              <select
                multiple
                value={form.networks}
                onChange={e => setForm({ ...form, networks: Array.from(e.target.selectedOptions, o => o.value) })}
                className={`w-full h-32 px-3 py-2 rounded-lg border ${isDark ? 'bg-ocean-800' : 'bg-gray-50'}`}
              >
                {networks.map(net => (
                  <option key={net.id} value={net.name}>{net.name}</option>
                ))}
              </select>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Restart Policy</h3>
              <select
                value={form.restartPolicy}
                onChange={e => setForm({ ...form, restartPolicy: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-ocean-800' : 'bg-gray-50'}`}
              >
                <option value="no">No</option>
                <option value="always">Always</option>
                <option value="on-failure">On Failure</option>
                <option value="unless-stopped">Unless Stopped</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              onClick={onClose}
              className={`flex-1 py-4 rounded-xl font-semibold ${isDark ? 'bg-ocean-800' : 'bg-gray-200'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.image || mutation.isPending}
              className={`flex-1 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-seafoam-600 to-seafoam-700 disabled:opacity-50`}
            >
              {mutation.isPending ? 'Creating...' : 'Create Container'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContainerModal;