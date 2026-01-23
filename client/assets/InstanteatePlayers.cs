using System;
using System.Collections.Generic;
using UnityEngine;

public class InstanteatePlayers : MonoBehaviour
{
        // Lista pública dos jogadores ativos (atualizada em cada chamada de InstantiateFromList)
    public PlayerData[] players;
    public GameObject playerPrefab;
    public Transform playersParent;

    [Header("Referências externas")]
    public FloorManager floorManager;
    // public GameState gameState; // Removido, não existe GameState

    // Helper para ativar andares conforme z do player local
    private void UpdateFloorsForLocalPlayer(float z)
    {
        if (floorManager == null) return;

        int playerZ = Mathf.RoundToInt(z);
        var activeFloors = new List<int>();

        // Regra 1: playerZ < 3
        if (playerZ < 3)
        {
            activeFloors.Add(playerZ);
            floorManager.SetActiveFloors(activeFloors);
            return;
        }

        // Regra 2: playerZ == 3
        if (playerZ == 3)
        {
            activeFloors.Add(3);
            bool podeAtivarAndar6 = false;
            float playerX = 0, playerY = 0;
            var localPlayer = System.Array.Find(players, p => p.isLocal);
            if (localPlayer != null)
            {
                playerX = localPlayer.x;
                playerY = localPlayer.y;
            }
            if (floorManager.floors.Length > 6 && floorManager.floors[6] != null)
            {
                var andar6Obj = floorManager.floors[6];
                var groundWalk6 = andar6Obj.transform.Find("groundWalk")?.GetComponent<UnityEngine.Tilemaps.Tilemap>();
                if (groundWalk6 == null)
                {
                    podeAtivarAndar6 = true;
                }
                else
                {
                    // Verifica se existe tile nas coordenadas do player no andar 6
                    Vector3Int cell = new Vector3Int((int)playerX, (int)playerY, 0);
                    bool temTile = groundWalk6.HasTile(cell);
                    if (!temTile)
                        podeAtivarAndar6 = true;
                }
            }
            else
            {
                // Não existe objeto andar6, pode ativar
                podeAtivarAndar6 = true;
            }
            Debug.Log($"[InstanteatePlayers] Pode ativar andar 6: {podeAtivarAndar6}");
            if (podeAtivarAndar6)
            {
                activeFloors.Add(6);
            }
            floorManager.SetActiveFloors(activeFloors);
            return;
        }

        // Regra 3: playerZ > 3
        if (playerZ > 3)
        {
            // Ativa apenas o andar atual e o andar 3
            if (playerZ < floorManager.floors.Length && floorManager.floors[playerZ] != null)
                activeFloors.Add(playerZ);
            if (3 < floorManager.floors.Length && floorManager.floors[3] != null)
                activeFloors.Add(3);
            floorManager.SetActiveFloors(activeFloors);
            return;
        }
    }
    public void InstantiateFromList(PlayerData[] players)
    {
                    // Converte campos sprite_* dos pokemons para array de int
            foreach (var player in players)
            {
                if (player.pokemons != null)
                {
                    foreach (var poke in player.pokemons)
                    {
                        poke.sprite_up = ParseSpriteArray(poke.sprite_up);
                        poke.sprite_down = ParseSpriteArray(poke.sprite_down);
                        poke.sprite_left = ParseSpriteArray(poke.sprite_left);
                        poke.sprite_right = ParseSpriteArray(poke.sprite_right);
                    }
                }
            }
        this.players = players; // Atualiza a lista pública
        Debug.Log($"[InstanteatePlayers] Método chamado. players == null? {players == null}");
        if (players == null || players.Length == 0)
        {
            Debug.Log("[InstanteatePlayers] Lista de players é null ou vazia.");
            return;
        }
        Debug.Log($"[InstanteatePlayers] Quantidade de players recebidos: {players.Length}");

        // Marca todos os jogadores existentes
        var existingPlayers = new System.Collections.Generic.Dictionary<string, GameObject>();
        if (playersParent != null)
        {
            foreach (Transform child in playersParent)
            {
                existingPlayers[child.name] = child.gameObject;
            }
        }

        // Atualiza ou instancia jogadores recebidos
        // Descobre o andar (z) do player local
        float localZ = 0;
        foreach (var p in players)
        {
            if (p.isLocal)
            {
                localZ = p.z;
                break;
            }
        }

        // Referência ao prefab local para outfits
        List<PlayerAnimator.OutfitSprites> prefabOutfits = null;
        if (playerPrefab != null)
        {
            var prefabAnimator = playerPrefab.GetComponent<PlayerAnimator>();
            if (prefabAnimator != null)
                prefabOutfits = prefabAnimator.outfits;
        }

        foreach (var player in players)
        {
            string playerObjName = $"Player_{player.id}_{player.name}";
            GameObject obj = null;
            bool isLocalPlayer = player.isLocal;

            // Só exibe jogadores no mesmo andar do player local
            bool mesmoAndar = Mathf.Approximately(player.z, localZ);

            Debug.Log($"[InstanteatePlayers] Atualizando {player.name} (id={player.id}) para pos ({player.x}, {player.y}, {player.z}), isLocal={isLocalPlayer}, mesmoAndar={mesmoAndar}");

            int sortingOrder = player.z > 3 ? 8 : 3;

            if (existingPlayers.TryGetValue(playerObjName, out obj))
            {
                // Centraliza o player no centro do tile
                // Garante que todos os PlayerAnimator tenham a lista de outfits
                var animInstance = obj.GetComponent<PlayerAnimator>();
                if (animInstance != null && (animInstance.outfits == null || animInstance.outfits.Count == 0) && prefabOutfits != null)
                {
                    animInstance.outfits = prefabOutfits;
                }
                var andarObj = GameObject.Find($"Andar{player.z}");
                var groundWalk = andarObj?.transform.Find("groundWalk")?.GetComponent<UnityEngine.Tilemaps.Tilemap>();
                if (groundWalk != null)
                {
                    Vector3Int cell = new Vector3Int((int)player.x, (int)player.y, (int)player.z);
                    obj.transform.position = groundWalk.GetCellCenterWorld(cell);
                }
                else
                {
                    obj.transform.position = new Vector3(player.x, player.y, player.z);
                }
                obj.SetActive(mesmoAndar); // Só ativa se estiver no mesmo andar
                existingPlayers.Remove(playerObjName);

                // Ajusta o SpriteRenderer order in layer
                var sr = obj.GetComponentInChildren<SpriteRenderer>();
                if (sr != null) sr.sortingOrder = sortingOrder;

                // Ativa/desativa CanvasUiPlayer para o player local
                var canvasUi = obj.GetComponentInChildren<CanvasUiPlayer>(true);
                if (canvasUi != null)
                    canvasUi.gameObject.SetActive(isLocalPlayer);

                // Ativa/desativa Camera para o player local
                var cameraObj = obj.transform.Find("Camera");
                if (cameraObj != null)
                    cameraObj.gameObject.SetActive(isLocalPlayer);

                // Ativa/desativa PlayerMoviment para o player local
                var playerMoviment = obj.GetComponent<PlayerMoviment>();
                if (playerMoviment != null)
                    playerMoviment.enabled = isLocalPlayer;

                // Atualiza o nome do player no CanvasName/txtNamePlayer
                var canvasName = obj.transform.Find("CanvasName");
                if (canvasName != null)
                {
                    canvasName.gameObject.SetActive(true);
                    var canvasComp = canvasName.GetComponent<Canvas>();
                    if (canvasComp != null)
                        canvasComp.sortingOrder = sortingOrder;
                    var txtNamePlayer = canvasName.transform.Find("txtNamePlayer");
                    if (txtNamePlayer != null)
                    {
                        var nameText = txtNamePlayer.GetComponent<UnityEngine.UI.Text>();
                        if (nameText != null)
                            nameText.text = player.name;
                    }
                    var nameFollow = canvasName.GetComponent<NameFollow>();
                    if (nameFollow != null)
                        nameFollow.target = obj.transform;
                }

                // Se for o player local, atualiza os andares, câmera e botão GM
                if (isLocalPlayer)
                {
                    if (canvasUi != null)
                    {
                        canvasUi.UpdateInfo(player.name, player.level, new Vector3(player.x, player.y, player.z), player.hp, player.maxHp, player.goldCoin);
                        // Ativa o botão GM apenas se vocation == 4
                        var btnMenuGM = canvasUi.transform.Find("MenuPrincipal/btnMenuGM");
                        if (btnMenuGM != null)
                        {
                            bool isGM = player.vocation == 4;
                            btnMenuGM.gameObject.SetActive(isGM);
                        }
                    }
                    UpdateFloorsForLocalPlayer(player.z);
                }

                // Sincroniza direção da sprite
                var anim = obj.GetComponent<PlayerAnimator>();
                if (anim != null && !string.IsNullOrEmpty(player.direction))
                {
                    if (!string.IsNullOrEmpty(player.pokemonName))
                        anim.SetMonsterDirection(player.direction);
                    else
                        anim.SetDirection(player.direction);
                }
            }
            else if (playerPrefab != null && playersParent != null)
            {
                // Pega o objeto do andar atual
                var andarObj = GameObject.Find($"Andar{player.z}");
                var groundWalk = andarObj?.transform.Find("groundWalk")?.GetComponent<UnityEngine.Tilemaps.Tilemap>();
                var groundWall = andarObj?.transform.Find("groundWall")?.GetComponent<UnityEngine.Tilemaps.Tilemap>();
            
                // Instancia novo player
                obj = Instantiate(playerPrefab, new Vector3(player.x, player.y, player.z), Quaternion.identity, playersParent);
                obj.name = playerObjName;
                obj.SetActive(mesmoAndar); // Só ativa se estiver no mesmo andar

                // Garante que o SpriteRenderer está acima do tilemap
                var sr = obj.GetComponentInChildren<SpriteRenderer>();
                if (sr != null) sr.sortingOrder = 3;

                // Atualiza o nome do player no CanvasName/txtNamePlayer
                var canvasName = obj.transform.Find("CanvasName");
                if (canvasName != null)
                {
                    canvasName.gameObject.SetActive(true);
                    var canvasComp = canvasName.GetComponent<Canvas>();
                    if (canvasComp != null)
                        canvasComp.sortingOrder = 3;
                    var txtNamePlayer = canvasName.transform.Find("txtNamePlayer");
                    if (txtNamePlayer != null)
                    {
                        var nameText = txtNamePlayer.GetComponent<UnityEngine.UI.Text>();
                        if (nameText != null)
                            nameText.text = player.name;
                    }
                }

                // Se for o player local, atualiza os andares e botão GM
                if (isLocalPlayer)
                {
                    // CanvasUiPlayer só habilitado para player local
                    var canvasUi = obj.GetComponentInChildren<CanvasUiPlayer>(true);
                    if (canvasUi != null)
                    {
                        canvasUi.gameObject.SetActive(isLocalPlayer);
                        // Atualiza sempre as infos do player local
                        canvasUi.UpdateInfo(player.name, player.level, new Vector3(player.x, player.y, player.z), player.hp, player.maxHp, player.goldCoin);
                        PlayerPrefs.SetString("playerName", player.name);
                        PlayerPrefs.Save();
                        // Ativa o botão GM apenas se vocation == 4
                        var btnMenuGM = canvasUi.transform.Find("MenuPrincipal/btnMenuGM");
                        if (btnMenuGM != null)
                        {
                            bool isGM = player.vocation == 4;
                            btnMenuGM.gameObject.SetActive(isGM);
                        }
                    }
                    UpdateFloorsForLocalPlayer(player.z);
                }

                // Sincroniza direção da sprite
                var anim = obj.GetComponent<PlayerAnimator>();
                if (anim != null && !string.IsNullOrEmpty(player.direction))
                {
                    if (!string.IsNullOrEmpty(player.pokemonName))
                        anim.SetMonsterDirection(player.direction);
                    else
                        anim.SetDirection(player.direction);
                }
            }
        
        }

        // Destroi jogadores que não estão mais na lista recebida (desconectaram)
        foreach (var kvp in existingPlayers)
        {
            Destroy(kvp.Value);
        }
    }

    // Utilitário para converter campos sprite_* de string para array de int
    private int[] ParseSpriteArray(object spriteField)
    {
        if (spriteField is string s)
        {
            s = s.Trim('[', ']', ' ');
            if (string.IsNullOrEmpty(s)) return new int[0];
            var parts = s.Split(',');
            int[] arr = new int[parts.Length];
            for (int i = 0; i < parts.Length; i++)
            {
                int val;
                if (int.TryParse(parts[i].Trim(), out val))
                    arr[i] = val;
                else
                    arr[i] = 0;
            }
            return arr;
        }
        if (spriteField is System.Collections.IEnumerable enumerable && !(spriteField is string))
        {
            var list = new System.Collections.Generic.List<int>();
            foreach (var item in enumerable)
            {
                if (item is int)
                    list.Add((int)item);
                else if (item is long)
                    list.Add((int)(long)item);
                else if (item != null && int.TryParse(item.ToString(), out int val))
                    list.Add(val);
            }
            return list.ToArray();
        }
        return new int[0];
    }
    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        // Se não foi setado no Inspector, tenta buscar automaticamente no GameObject "Game" ou no parent
        if (floorManager == null)
        {
            // Tenta encontrar pelo nome do GameObject
            var gameObj = GameObject.Find("Game");
            if (gameObj != null)
            {
                floorManager = gameObj.GetComponent<FloorManager>();
            }
            // Se ainda não achou, tenta no parent
            if (floorManager == null)
            {
                floorManager = GetComponentInParent<FloorManager>();
            }
        }
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
