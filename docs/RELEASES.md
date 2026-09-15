# Releases e atualização automática — FinTrack

## Como o usuário baixa

1. Abra [Releases](https://github.com/MatheusPereira64/Fintrack/releases)
2. Baixe o arquivo `FinTrack-X.Y.Z.apk`
3. No Android, permita instalar apps dessa origem e abra o APK

## Atualização dentro do app

- Ao abrir o app, o FinTrack consulta a API pública de releases do GitHub.
- Se houver versão mais nova **com APK anexado**, oferece atualizar.
- Em **Configurações → Procurar atualizações** o mesmo fluxo é manual.
- A instalação usa o mesmo `applicationId` (`com.fintrackapp`). Com a **mesma keystore de assinatura**, o Android **substitui o APK e mantém** SQLite e preferências.

> No Android moderno o usuário precisa confirmar a instalação (e, na 1ª vez, permitir “instalar apps desconhecidos” para o FinTrack). Não é possível instalar em silêncio total sem Play Store / Device Owner.

## Publicar uma nova versão (mantenedor)

1. Atualize a versão em:
   - `package.json` → `"version"`
   - `android/app/build.gradle` → `versionName` e **incremente** `versionCode`
2. Commit na branch desejada.
3. Crie e envie um tag:

```bash
git tag v2.0.1
git push origin v2.0.1
```

4. O workflow **Release** gera o APK e cria a GitHub Release com o arquivo anexado.

No corpo da release, inclua (o app também lê isso):

```text
versionCode: 3
```

## CI/CD

Workflow **CI** (push/PR em `main` e `development`):

- ESLint
- Jest
- jscpd (código duplicado; falha se acima do limiar)
- TypeScript (informativo)
- Build `assembleRelease` + artifact

## Keystore

Hoje o release usa a keystore **debug** (ver `build.gradle`). Para distribuição séria, gere uma keystore de produção e configure `signingConfigs.release` + secrets no Actions — **sempre a mesma key** nas atualizações, senão o Android exige desinstalar (e apagar dados).
