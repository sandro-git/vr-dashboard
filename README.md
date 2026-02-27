# VR Dashboard — Wake-on-LAN + Shutdown

Dashboard de contrôle pour 7 PCs VR : allumage à distance (WoL) et extinction.

---

## Prérequis

### Machine centrale (serveur)
- [Deno](https://deno.com) installé

### Chaque PC VR distant (agent)
- [Deno](https://deno.com) installé
- Wake-on-LAN activé (voir section Configuration WoL ci-dessous)

---

## Installation de Deno

```powershell
# Windows (PowerShell) — à exécuter sur chaque machine
irm https://deno.land/install.ps1 | iex
```

---

## Configuration

### 1. Renseigner les MACs et IPs dans `config.ts`

Remplacer les valeurs fictives par les vraies :

```ts
{ id: 1, name: "VR-01", ip: "192.168.1.101", mac: "AA:BB:CC:DD:EE:01", network: 1 },
```

Pour trouver l'adresse MAC d'un PC Windows :
```powershell
ipconfig /all
# Chercher "Adresse physique" sur la carte réseau principale
```

### 2. Ouvrir le pare-feu sur la machine centrale (serveur)

Les agents des autres PCs se connectent au serveur sur le port 8000.
Exécuter sur la machine centrale en administrateur :

```powershell
netsh advfirewall firewall add rule name="VR Dashboard" dir=in action=allow protocol=TCP localport=8000
```

### 3. Activer Wake-on-LAN sur chaque PC distant

**Dans le BIOS :**
- Chercher "Wake on LAN", "Power On by PCI-E" ou similaire → Activer

**Dans Windows :**
1. Gestionnaire de périphériques → Cartes réseau
2. Double-clic sur la carte → onglet **Gestion de l'alimentation**
3. Cocher "Autoriser ce périphérique à sortir l'ordinateur du mode veille"
4. Onglet **Avancé** → "Wake on Magic Packet" → Activé

---

## Lancement

### Serveur (machine centrale)

```bash
cd vr-dashboard
deno task server
# Dashboard disponible sur http://localhost:8000
```

### Agent (chaque PC VR)

**Aucun fichier à copier.** Le serveur expose `agent.ts` directement via HTTP.
Remplacer `192.168.1.100` par l'IP de la machine centrale et `1` par l'ID du PC.

```powershell
deno run --allow-net --allow-run http://192.168.1.100:8000/agent.ts --id=1
```

Deno télécharge et exécute le script en une seule commande. Le script est mis en
cache localement ; il ne re-télécharge que si le serveur est joignable.

### Démarrage automatique avec Windows (Planificateur de tâches)

Toutes les commandes ci-dessous sont à exécuter dans PowerShell **en administrateur**.
Adapter le chemin Deno, l'IP du serveur et le `--id` à chaque PC.

Pour trouver le chemin exact de Deno sur un PC :
```powershell
where.exe deno
```

---

#### Serveur (machine centrale) — lancement automatique du serveur

Si Deno est installé globalement (ex. via Chocolatey) :

```powershell
$a = New-ScheduledTaskAction -Execute "C:\ProgramData\chocolatey\lib\deno\deno.exe" -Argument "run --allow-net --allow-read --unstable-net C:\chemin\vr-dashboard\main.ts" -WorkingDirectory "C:\chemin\vr-dashboard"; $t = New-ScheduledTaskTrigger -AtStartup; $p = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest; Register-ScheduledTask -TaskName "VR-Dashboard-Server" -Action $a -Trigger $t -Principal $p
```

---

#### PC distant — lancement automatique de l'agent

Si Deno est installé globalement (ex. via Chocolatey) :

```powershell
$a = New-ScheduledTaskAction -Execute "C:\ProgramData\chocolatey\lib\deno\deno.exe" -Argument "run --reload --allow-net --allow-run http://192.168.1.100:8000/agent.ts --id=2"; $t = New-ScheduledTaskTrigger -AtStartup; $p = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest; Register-ScheduledTask -TaskName "VR-Dashboard-Agent" -Action $a -Trigger $t -Principal $p
```

Si Deno est installé dans le profil utilisateur (ex. `C:\Users\NOM\.deno\bin\deno.exe`),
remplacer `SYSTEM` par le nom de session et utiliser `-AtLogon` :

```powershell
$a = New-ScheduledTaskAction -Execute "C:\Users\NOM\.deno\bin\deno.exe" -Argument "run --reload --allow-net --allow-run http://192.168.1.100:8000/agent.ts --id=2"; $t = New-ScheduledTaskTrigger -AtLogon -User "NOM"; Register-ScheduledTask -TaskName "VR-Dashboard-Agent" -Action $a -Trigger $t -RunLevel Highest
```

---

Pour vérifier que la tâche tourne :
```powershell
Get-ScheduledTask -TaskName "VR-Dashboard-Agent"
```

Pour la supprimer :
```powershell
Unregister-ScheduledTask -TaskName "VR-Dashboard-Agent" -Confirm:$false
```

---

## Utilisation

1. Ouvrir `http://<ip-serveur>:8000` dans un navigateur
2. Chaque PC affiche son statut : **En ligne** (vert) / **Hors ligne** (rouge)
3. **Wake** : envoie un magic packet UDP → démarre le PC (fonctionne même si le PC est éteint)
4. **Shutdown** : envoie la commande à l'agent → exécute `shutdown /s /t 0`

> Le bouton Shutdown est grisé si l'agent n'est pas connecté (PC éteint ou agent non lancé).

---

## Limitations connues

- **WoL depuis le même PC** : la machine centrale ne peut pas se réveiller elle-même via WoL.
  Elle gère les 6 autres ; pour la démarrer, utiliser le bouton physique.
- **WoL et sous-réseaux** : le broadcast UDP reste sur le sous-réseau local.
  Si les PCs sont sur 2 réseaux différents, le serveur doit avoir une interface sur chaque réseau,
  ou utiliser un directed broadcast (à configurer dans `lib/wol.ts`).
- **Pare-feu Windows** : s'assurer que le port 8000 est ouvert sur la machine centrale
  pour que les agents puissent s'y connecter.
