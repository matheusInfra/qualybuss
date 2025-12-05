import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { toast } from 'react-hot-toast';
import './AvatarUpload.css';

export default function AvatarUpload({ url, onUpload, editable = true }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (url) setAvatarUrl(url);
  }, [url]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o bucket 'avatars' (Se seu bucket chamar 'avatares', mude aqui)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pega a URL pública
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      onUpload(data.publicUrl); // Passa a URL para o pai (Formulário)
      toast.success('Foto atualizada!');

    } catch (error) {
      toast.error('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="avatar-upload-container">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="avatar-image"
        />
      ) : (
        <div className="avatar-placeholder">
          <span className="material-symbols-outlined">person</span>
        </div>
      )}
      
      {editable && (
        <div className="avatar-edit-overlay">
          <label htmlFor="single" className="upload-button">
            {uploading ? '...' : <span className="material-symbols-outlined">photo_camera</span>}
          </label>
          <input
            style={{ display: 'none' }}
            type="file"
            id="single"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
}