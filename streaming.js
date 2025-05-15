<script src="https://player.twitch.tv/js/embed/v1.js"></script>
 
 // --- Twitch Embed ---
      const twitchPlayer = new Twitch.Player("twitch-player", {
        width: 800,
        height: 450,
        channel: "fallenoneart",
        parent: ["localhost", "caitlinscreativespace.com"] // supports local + production
      });
    
      twitchPlayer.setVolume(0.5);
    
      // --- Twitch Live Check ---
      async function checkTwitchLive() {
        const resp = await fetch("https://api.twitch.tv/helix/streams?user_login=fallenoneart", {
          headers: {
            "Client-ID": "l7o17x4jquesk1htz1r5zwicaj6v"  // Use your real Client ID
          }
        });
        const { data } = await resp.json();
        document.getElementById("twitch-live")
          ?.classList.toggle("live", data && data.length > 0);
      }
    
      // --- YouTube Live Check ---
      async function checkYouTubeLive() {
        const apiKey = "109546453641-rppq2bcferlo9or60730io15lk34vg03.apps.googleusercontent.com"; // Your YouTube API key
        const channelId = "UCvbVbJh3CWljgXGSBuT1wAQ";
    
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=id&channelId=UCvbVbJh3CWljgXGSBuT1wAQ&eventType=live&type=video&key=109546453641-rppq2bcferlo9or60730io15lk34vg03.apps.googleusercontent.com}`
        );
        const { items } = await resp.json();
    
        document.getElementById("youtube-live")
          ?.classList.toggle("live", items && items.length > 0);
      }
    
      // initial check + poll every 60s
      checkTwitchLive(); checkYouTubeLive();
      setInterval(checkTwitchLive, 60000);
      setInterval(checkYouTubeLive, 60000);