import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path

# Configure Streamlit page layout and metadata
st.set_page_config(
    page_title="OmniCalc - Smart Calculator & Graphing Suite",
    page_icon="🧮",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Custom CSS to provide seamless, edge-to-edge experience within Streamlit
st.markdown(
    """
    <style>
    /* Remove padding & margins around Streamlit block container */
    .block-container {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
    }
    header[data-testid="stHeader"] {
        display: none !important;
    }
    footer {
        display: none !important;
    }
    #MainMenu {
        visibility: hidden;
    }
    iframe {
        border: none !important;
        width: 100% !important;
        min-height: 100vh !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# Read core files
current_dir = Path(__file__).parent
html_file = current_dir / "index.html"
css_file = current_dir / "style.css"
js_file = current_dir / "app.js"

html_content = html_file.read_text(encoding="utf-8")
css_content = css_file.read_text(encoding="utf-8")
js_content = js_file.read_text(encoding="utf-8")

# Inline CSS and JavaScript to make the iframe self-contained for Streamlit Cloud
inlined_html = html_content.replace(
    '<link rel="stylesheet" href="style.css">',
    f'<style>\n{css_content}\n</style>'
).replace(
    '<script src="app.js"></script>',
    f'<script>\n{js_content}\n</script>'
)

# Render HTML inside Streamlit
components.html(inlined_html, height=1050, scrolling=True)
