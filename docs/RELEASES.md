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

## Keystore de produção

O workflow **Release** só publica APK assinado com a keystore de produção: sem os secrets abaixo, ele falha em vez de cair na keystore de debug (que está no repositório e qualquer pessoa pode usar). O workflow **CI** e o build local continuam usando a debug quando a keystore não está configurada.

> **Toda atualização precisa ser assinada com a mesma keystore.** Se ela for perdida, nenhum usuário consegue atualizar: será preciso desinstalar (apagando os dados) e instalar de novo. Guarde o arquivo `.jks` e as senhas fora do computador (gerenciador de senhas + cópia em outro lugar). Nunca faça commit da keystore.

### 1. Gerar a keystore (uma vez só)

Precisa de um JDK 17 (o `keytool` vem com ele):

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore fintrack-upload.jks -alias fintrack -keyalg RSA -keysize 4096 -validity 10000
```

O `keytool` pede a senha da keystore e os dados do certificado. Em PKCS12 a senha da chave é a mesma da keystore.

### 2. Cadastrar os secrets no GitHub

Em **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Valor |
|---|---|
| `FINTRACK_UPLOAD_KEYSTORE_BASE64` | conteúdo do `.jks` em base64 (comando abaixo) |
| `FINTRACK_UPLOAD_STORE_PASSWORD` | senha da keystore |
| `FINTRACK_UPLOAD_KEY_ALIAS` | `fintrack` (o `-alias` usado acima) |
| `FINTRACK_UPLOAD_KEY_PASSWORD` | senha da chave (a mesma da keystore em PKCS12) |

Para gerar o base64 no Windows (PowerShell), já copiando para a área de transferência:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("fintrack-upload.jks")) | Set-Clipboard
```

### 3. Travar o certificado (recomendado)

No primeiro release assinado, o passo **Conferir assinatura do APK** mostra o SHA-256 do certificado e avisa para cadastrá-lo. Em **Settings → Secrets and variables → Actions → Variables**, crie `FINTRACK_UPLOAD_CERT_SHA256` com esse valor. A partir daí, um release assinado com outra keystore falha antes de ser publicado.

### Build local assinado (opcional)

Para gerar o APK de produção na sua máquina, coloque em `~/.gradle/gradle.properties` (fora do repositório):

```properties
FINTRACK_UPLOAD_STORE_FILE=C:/caminho/fintrack-upload.jks
FINTRACK_UPLOAD_STORE_PASSWORD=...
FINTRACK_UPLOAD_KEY_ALIAS=fintrack
FINTRACK_UPLOAD_KEY_PASSWORD=...
```

### Migração de quem instalou até a 1.0.6

As versões até a 1.0.6 foram assinadas com a keystore de debug. O Android recusa atualizar um app instalado com uma assinatura por um APK com outra, então o primeiro release com a keystore de produção **não instala por cima**: a atualização dentro do app vai falhar. Quem já usa o app precisa exportar os dados, desinstalar e instalar a versão nova. Avise isso nas notas desse release.
