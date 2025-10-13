# Configuration Cloudinary pour l'upload des logos

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env` :

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Comment obtenir les clés Cloudinary

1. Créez un compte sur [cloudinary.com](https://cloudinary.com)
2. Allez dans le Dashboard
3. Copiez les valeurs :
   - **Cloud Name** → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

## Configuration Upload Preset

1. Dans le Dashboard Cloudinary, allez dans **Settings** > **Upload**
2. Créez un nouveau **Upload Preset** nommé `optima-logos`
3. Configurez :
   - **Signing Mode** : `Unsigned` (pour simplifier)
   - **Folder** : `optima-logos`
   - **Resource Type** : `Image`
   - **Max File Size** : `5MB`

## Fonctionnalités

- ✅ **Widget Cloudinary officiel** : Interface moderne et sécurisée
- ✅ **Upload direct** : Pas de serveur intermédiaire nécessaire
- ✅ **Redimensionnement automatique** : Optimisation des images
- ✅ **Formats supportés** : JPG, PNG, GIF, WebP
- ✅ **Taille max** : 5MB
- ✅ **Intégration PDF** : Logo affiché dans les factures
- ✅ **Prévisualisation** : Aperçu en temps réel
- ✅ **URL manuelle** : Option de fallback

## Structure des dossiers Cloudinary

Les logos sont stockés dans le dossier `optima-logos/` sur Cloudinary.

## Documentation officielle

- [Next Cloudinary](https://next.cloudinary.dev/)
- [Upload Widget](https://next.cloudinary.dev/guides/uploading-images-and-videos)
