using System;
using System.Net.Http;
using System.Text;
using Newtonsoft.Json;
using JunimoServer.Util;
using StardewModdingAPI;
using System.Threading.Tasks;
using StardewModdingAPI.Events;
using StardewValley;

namespace JunimoServer.Services.DiscordWebhook
{
    public class DiscordWebhookService : ModService
    {
        private string _webhookUrl;
        private readonly HttpClient _httpClient = new HttpClient();

        public DiscordWebhookService(IModHelper helper, IMonitor monitor) : base(helper, monitor)
        {
        }

        public override void Entry()
        {
            _webhookUrl = Environment.GetEnvironmentVariable("DISCORD_WEBHOOK_URL")?.Trim();

            if (string.IsNullOrEmpty(_webhookUrl))
            {
                Monitor.Log("DISCORD_WEBHOOK_URL not set, Discord notifications are disabled.", LogLevel.Debug);
                return;
            }

            InviteCodeFile.OnInviteCodeChanged += SendInviteCodeNotification;
            
            Helper.Events.GameLoop.SaveLoaded += OnSaveLoaded;
            Helper.Events.Multiplayer.PeerConnected += OnPeerConnected;
            Helper.Events.Multiplayer.PeerDisconnected += OnPeerDisconnected;

            Monitor.Log("Discord Webhook notifications enabled.", LogLevel.Info);
        }

        private void OnSaveLoaded(object sender, SaveLoadedEventArgs e)
        {
            var farmName = Game1.getFarm()?.Name ?? "Stardew Farm";
            _ = SendWebhookMessageAsync($":white_check_mark: **Server Started:** {farmName}");
        }

        private void OnPeerConnected(object sender, PeerConnectedEventArgs e)
        {
            var playerName = e.Peer.PlayerID.ToString(); // Default to ID if name not known
            _ = SendWebhookMessageAsync($":inbox_tray: **Player Joined:** {playerName}");
        }

        private void OnPeerDisconnected(object sender, PeerDisconnectedEventArgs e)
        {
            var playerName = e.Peer.PlayerID.ToString();
             _ = SendWebhookMessageAsync($":outbox_tray: **Player Left:** {playerName}");
        }

        private void SendInviteCodeNotification(string inviteCode)
        {
            _ = SendWebhookMessageAsync($":key: **New Invite Code:** `{inviteCode}`");
        }

        private async Task SendWebhookMessageAsync(string message)
        {
            try
            {
                var payload = new { content = message };
                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                // Use the environment variable at runtime in case it changes
                var url = Environment.GetEnvironmentVariable("DISCORD_WEBHOOK_URL")?.Trim();
                if (string.IsNullOrEmpty(url)) return;

                var response = await _httpClient.PostAsync(url, content);
                if (!response.IsSuccessStatusCode)
                {
                    Monitor.Log($"Failed to send Discord Webhook: {response.StatusCode} {response.ReasonPhrase}", LogLevel.Error);
                }
            }
            catch (Exception ex)
            {
                Monitor.Log($"Error sending message to Discord Webhook: {ex.Message}", LogLevel.Error);
            }
        }
    }
}
