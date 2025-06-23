const config = {
  "fidgetInstanceDatums": {
    "text:welcome-hero": {
      "config": {
        "editable": true,
        "settings": {
          "title": "Welcome to My Space",
          "text": "# 🚀 Welcome to My Digital Universe\\n\\nThanks for visiting! Explore my content, connect with me, and discover what I'm working on. This space is designed to showcase the best of what I do.",
          "fontFamily": "var(--user-theme-font)",
          "fontColor": "var(--user-theme-font-color)",
          "headingsFontFamily": "var(--user-theme-headings-font)",
          "headingsFontColor": "var(--user-theme-headings-font-color)",
          "background": "var(--user-theme-fidget-background)",
          "showOnMobile": true
        },
        "data": {}
      },
      "fidgetType": "text",
      "id": "text:welcome-hero"
    },
    "links:social-main": {
      "config": {
        "editable": true,
        "settings": {
          "title": "🌐 Connect With Me",
          "links": [
            {"text": "Twitter", "url": "https://twitter.com/username", "avatar": "https://abs.twimg.com/favicons/twitter.ico", "description": "Follow my thoughts"},
            {"text": "GitHub", "url": "https://github.com/username", "avatar": "https://github.com/favicon.ico", "description": "Check my code"},
            {"text": "LinkedIn", "url": "https://linkedin.com/in/username", "avatar": "https://static.licdn.com/favicon.ico", "description": "Professional network"}
          ],
          "viewMode": "grid",
          "itemBackground": "var(--user-theme-fidget-background)",
          "HeaderColor": "var(--user-theme-headings-font-color)",
          "DescriptionColor": "var(--user-theme-font-color)",
          "background": "var(--user-theme-fidget-background)",
          "showOnMobile": true
        },
        "data": {}
      },
      "fidgetType": "links",
      "id": "links:social-main"
    },
    "feed:community": {
      "config": {
        "editable": true,
        "settings": {
          "feedType": "filter",
          "filterType": "channel_id",
          "channel": "community",
          "selectPlatform": {"name": "Farcaster", "icon": "/images/farcaster.jpeg"},
          "background": "var(--user-theme-fidget-background)",
          "showOnMobile": true
        },
        "data": {}
      },
      "fidgetType": "feed",
      "id": "feed:community"
    },
    "gallery:showcase": {
      "config": {
        "editable": true,
        "settings": {
          "selectMediaSource": {"name": "URL"},
          "imageUrl": "https://images.unsplash.com/photo-1557804506-669a67965ba0",
          "scale": 100,
          "redirectionURL": "https://myportfolio.com",
          "background": "var(--user-theme-fidget-background)",
          "showOnMobile": true
        },
        "data": {}
      },
      "fidgetType": "gallery",
      "id": "gallery:showcase"
    },
    "text:about": {
      "config": {
        "editable": true,
        "settings": {
          "title": "About Me",
          "text": "**Creative Developer** building the future of web3\\n\\n✨ Passionate about design\\n🚀 Love cutting-edge tech\\n🎨 Creating digital experiences",
          "fontFamily": "var(--user-theme-font)",
          "fontColor": "var(--user-theme-font-color)",
          "headingsFontFamily": "var(--user-theme-headings-font)",
          "headingsFontColor": "var(--user-theme-headings-font-color)",
          "background": "var(--user-theme-fidget-background)",
          "showOnMobile": true
        },
        "data": {}
      },
      "fidgetType": "text",
      "id": "text:about"
    },
    "Video:demo": {
      "config": {
        "editable": true,
        "settings": {
          "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          "size": 100,
          "background": "var(--user-theme-fidget-background)",
          "showOnMobile": true
        },
        "data": {}
      },
      "fidgetType": "Video",
      "id": "Video:demo"
    },
    "Rss:news": {
      "config": {
        "editable": true,
        "settings": {
          "rssUrl": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
          "fontFamily": "var(--user-theme-font)",
          "fontColor": "var(--user-theme-font-color)",
          "headingsFontFamily": "var(--user-theme-headings-font)",
          "headingsFontColor": "var(--user-theme-headings-font-color)",
          "background": "var(--user-theme-fidget-background)",
          "showOnMobile": true
        },
        "data": {}
      },
      "fidgetType": "Rss",
      "id": "Rss:news"
    }
  },
  "layoutID": "vertical-column-space",
  "layoutDetails": {
    "layoutFidget": "grid",
    "layoutConfig": {
      "layout": [
        {
          "i": "text:welcome-hero",
          "x": 0,
          "y": 0,
          "w": 3,
          "h": 5,
          "minW": 3,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        },
        {
          "i": "links:social-main",
          "x": 3,
          "y": 0,
          "w": 2,
          "h": 5,
          "minW": 2,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        },
        {
          "i": "gallery:showcase",
          "x": 5,
          "y": 0,
          "w": 2,
          "h": 5,
          "minW": 2,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        },
        {
          "i": "Video:demo",
          "x": 7,
          "y": 0,
          "w": 2,
          "h": 4,
          "minW": 2,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        },
        {
          "i": "text:about",
          "x": 9,
          "y": 0,
          "w": 3,
          "h": 4,
          "minW": 3,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        },
        {
          "i": "feed:community",
          "x": 0,
          "y": 5,
          "w": 4,
          "h": 3,
          "minW": 4,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        },
        {
          "i": "Rss:news",
          "x": 4,
          "y": 4,
          "w": 3,
          "h": 4,
          "minW": 3,
          "maxW": 36,
          "minH": 2,
          "maxH": 36,
          "moved": false,
          "static": false
        }
      ]
    }
  },
  "isEditable": true,
  "fidgetTrayContents": [],
  "theme": {
    "id": "electric-neon",
    "name": "Electric Neon",
    "properties": {
      "font": "Inter",
      "fontColor": "#ffffff",
      "headingsFont": "Roboto",
      "headingsFontColor": "#00ffff",
      "background": "linear-gradient(45deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      "backgroundHTML": "",
      "musicURL": "",
      "fidgetBackground": "rgba(30, 100, 150, 0.95)",
      "fidgetBorderWidth": "1px",
      "fidgetBorderColor": "#00ffff",
      "fidgetShadow": "0 0 20px rgba(0, 255, 255, 0.5)",
      "fidgetBorderRadius": "12px",
      "gridSpacing": "16"
    }
  }
};