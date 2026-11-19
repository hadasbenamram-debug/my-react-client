import {createSlice} from '@reduxjs/toolkit';

/** מצב ממשק משותף לכמה רכיבים (הכותרת והתפריט הצדדי) */
export interface UiState {
    menuOpen: boolean;
}

const initialState: UiState = {menuOpen: false};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        menuToggled(state) {
            state.menuOpen = !state.menuOpen;
        },
        menuClosed(state) {
            state.menuOpen = false;
        },
    },
});

export const {menuToggled, menuClosed} = uiSlice.actions;
export default uiSlice.reducer;

export const selectMenuOpen = (state: {ui: UiState}) => state.ui.menuOpen;
