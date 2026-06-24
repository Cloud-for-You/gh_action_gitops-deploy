# Release Application Action

GitHub Action pro nasazení aplikace přes GitOps repozitář. Akce podporuje jak
přímý push do větve, tak vytvoření pull requestu pro schvalované nasazování.
Automatizuje proces nasazení aplikací přes GitOps repozitář aktualizací
konkrétních deployment souborů a values v daném klíči.

## Funkce

- Klonuje cílový GitOps repozitář
- Aktualizuje deployment soubory pomocí JSONPath výrazů
- Podporuje workflow s přímým push nebo pull requestem
- Kompatibilní s GitHub Enterprise

## Vstupní parametry

| Parametr                | Popis                                                                              | Povinný | Výchozí         |
| ----------------------- | ---------------------------------------------------------------------------------- | ------- | --------------- |
| `repository`            | GitOps repozitář, kam bude aplikace nasazena (např. `owner/repo`)                  | Ano     | -               |
| `ref`                   | Cílová větev v GitOps repozitáři, kam bude aplikace nasazena                       | Ano     | -               |
| `path`                  | Lokální cesta pro klonování GitOps repozitáře                                      | Ne      | Prázdný řetězec |
| `token`                 | GitHub token s oprávněním k pushi do cílové větve                                  | Ano     | -               |
| `deployment_file`       | Cesta k deployment souboru, který bude aktualizován (relativní k rootu repozitáře) | Ano     | -               |
| `jsonpath`              | JSONPath výraz pro umístění hodnoty v deployment souboru (např. `$.spec.version`)  | Ano     | -               |
| `value`                 | Nová hodnota na zadaném JSONPath                                                   | Ano     | -               |
| `github_enterprise_url` | URL GitHub Enterprise instance (např. `https://github.mycompany.com`)              | Ne      | -               |
| `push`                  | Nastavit na `true` pro přímý push do cílové větve                                  | Ne      | `false`         |
| `pull_request`          | Nastavit na `true` pro vytvoření pull requestu (pouze když `push` je `false`)      | Ne      | `false`         |
| `message`               | Zpráva pro commit/pull request (např. `Update version to v1.2.3`)                  | Ne      | -               |

## Výstupy

| Výstup | Popis              |
| ------ | ------------------ |
| `time` | Čas dokončení akce |

## Příklady použití

### Přímý push do větve

Aktualizace deployment souboru a přímý push do větve `main`:

```yaml
- name: Release application
  uses: owner/repo@v1
  with:
    repository: 'gitops-apps/production'
    ref: 'main'
    token: ${{ secrets.GITOPS_TOKEN }}
    deployment_file: 'apps/myapp/deployment.yaml'
    jsonpath: '$.spec.version'
    value: 'v1.2.3'
    push: true
```

### Vytvoření Pull Requestu

Aktualizace deployment souboru a vytvoření pull requestu pro review:

```yaml
- name: Release application
  uses: owner/repo@v1
  with:
    repository: 'gitops-apps/staging'
    ref: 'staging'
    token: ${{ secrets.GITOPS_TOKEN }}
    deployment_file: 'apps/myapp/deployment.yaml'
    jsonpath: '$.spec.version'
    value: 'v1.2.3'
    pull_request: true
```

### GitHub Enterprise

Použití s GitHub Enterprise:

```yaml
- name: Release application
  uses: owner/repo@v1
  with:
    repository: 'gitops-apps/production'
    ref: 'main'
    token: ${{ secrets.GITOPS_TOKEN }}
    github_enterprise_url: 'https://github.company.com'
    deployment_file: 'apps/myapp/deployment.yaml'
    jsonpath: '$.spec.version'
    value: 'v1.2.3'
    push: true
```

### Komplexní JSONPath

Aktualizace vnořených hodnot v polích:

```yaml
- name: Release application
  uses: owner/repo@v1
  with:
    repository: 'gitops-apps/production'
    ref: 'main'
    token: ${{ secrets.GITOPS_TOKEN }}
    deployment_file: 'apps/myapp/deployment.yaml'
    jsonpath: '$.spec.template.spec.containers[0].image'
    value: 'myregistry/myapp:v1.2.3'
    push: true
```

### Práce s poli

JSONPath výrazy podporují různé způsoby adresování polí:

| Operand            | Popis                             | Příklad                              |
| ------------------ | --------------------------------- | ------------------------------------ |
| `[index]`          | Přístup k prvku pole podle indexu | `$.apps[0].name`                     |
| `[*]`              | Všechny prvky pole                | `$.apps[*].replicas`                 |
| `['property']`     | Přístup k vlastnosti (bracket)    | `$['apps'][0]['name']`               |
| `.`                | Přístup k vlastnosti (dot)        | `$.apps[0].name`                     |
| `[?(@.prop==val)]` | Select podle podmínky             | `$.apps[?(@.name=='myapp')].version` |

Příklady pro aktualizaci polí:

```yaml
# Aktualizace konkrétního prvku pole
jsonpath: '$.apps[0].name'
value: 'myapp'

# Aktualizace všech prvků pole (wildcard)
jsonpath: '$.apps[*].replicas'
value: '3'

# Select podle podmínky - aktualizace verze konkrétní app
jsonpath: "$.apps[?(@.name=='myapp')].version"
value: 'v2.0.0'
```

## Požadavky

- Deployment soubor musí být platný YAML soubor
- GitHub token musí mít read/write přístup k cílovému repozitáři
- Pro soukromé repozitáře ověřte, že token má správná oprávnění
