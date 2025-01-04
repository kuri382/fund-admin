# Settings

## set environmental variables
```sh
.env.developement # for `npm run dev`
.env.production # for `npm run build` or `npm run start`
```

## firebase
```sh
firebase projects:list
firebase use granite-dev-2024
firebase use granite-prd # fix .env.production
```

# Develop
```sh
npm run dev

npm run build
firebase serve --only hosting
```

# Deploy
```sh
npm run build
firebase deploy
```


