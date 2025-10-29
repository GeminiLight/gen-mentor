import streamlit as st
from streamlit_option_menu import option_menu


def render_navigation():
    import time
    start = time.time()
    # st.write('<style>div.block-container{padding-top:2rem;}</style>', unsafe_allow_html=True)
    pages = ["Onboarding", "Goal Management", "Learning Path", "Learner Profile", "Dashboard"]
    icons = ["house", "clipboard-check", "flag", "person", "grid"]
    page_to_mean_dict = {
        "Onboarding": "Onboarding",
        "Skill Gap": "Onboarding",
        "Goal Management": "Goal Management",
        "Learning Path": "Learning Path",
        "Knowledge Document": "Learning Path",
        "Learner Profile": "Learner Profile",
        "Dashboard": "Dashboard",
    }
    with st.sidebar:
        # styles = {"container": {"padding": "0.2rem 0", "background-color": "#22222200"}}
        selected_menu_selection_name = option_menu(
            "",
            pages,
            default_index=pages.index(page_to_mean_dict[st.session_state.selected_page]),
            orientation="vertical",
            manual_select=pages.index(page_to_mean_dict[st.session_state.selected_page]),
            # styles=styles,
            icons=icons,
            menu_icon="cast",
            on_change=update_selected_page,
            key=f"menu_selection_name" # the key should be always the same as the key in the session state
        )
    # if selected_menu_selection_name != st.session_state.selected_page:
    #     st.session_state.selected_page = selected_menu_selection_name
    #     st.switch_page(f"pages/{selected_menu_selection_name.lower().replace(' ', '_')}.py")
    end = time.time()
    return selected_menu_selection_name


def update_selected_page(key):
    if st.session_state[key] != st.session_state.selected_page:
        # st.session_state["selected_page"] = st.session_state[key]
        # selected_menu_selection_name = st.session_state["selected_page"]
        # st.switch_page(f"pages/{selected_menu_selection_name.lower().replace(' ', '_')}.py")
        print("Switched to: ", st.session_state.selected_page)

# with st.sidebar:
#         tabs = on_hover_tabs(tabName=['Dashboard', 'Money', 'Economy'], 
#                              iconName=['dashboard', 'money', 'economy'],
#                              styles = {'navtab': {'background-color':'#111',
#                                                   'color': '#818181',
#                                                   'font-size': '18px',
#                                                   'transition': '.3s',
#                                                   'white-space': 'nowrap',
#                                                   'text-transform': 'uppercase'},
#                                        'tabStyle': {':hover :hover': {'color': 'red',
#                                                                       'cursor': 'pointer'}},
#                                        'tabStyle' : {'list-style-type': 'none',
#                                                      'margin-bottom': '30px',
#                                                      'padding-left': '30px'},
#                                        'iconStyle':{'position':'fixed',
#                                                     'left':'7.5px',
#                                                     'text-align': 'left'},
#                                        },
#                              key="1")



        # menu_selection = option_menu(None, pages,
        #                              icons=['house', 'search'],
        #                              menu_icon="cast", default_index=0, orientation="horizontal",
        #                              manual_select=st.session_state.selected_page,
        #                              styles=styles,
        #                              key='menu_selection')
        # if st.session_state.get("manual_selection_override", False):
        #     menu_selection = pages[st.session_state["selected_page"]]
        #     st.session_state["manual_selection_override"] = False
        #     st.session_state["selected_page"] = None
