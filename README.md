# Weavr

![Local-First](https://img.shields.io/badge/Local--First-Yes-success)
![Open Source](https://img.shields.io/badge/Open%20Source-MIT-blue)
![GunDB](https://img.shields.io/badge/Tech-GunDB-orange)

> **"Draft Event Sourcing systems and DDD architectures directly in your browser without a server."**

<!-- TODO: Add a high-quality GIF here showing: Adding a node -> Dragging a link -> Seeing it sync in a second window. -->
<!-- ![Weavr Demo](https://weavr.dk/demo.gif) -->

Weavr is an Event Modelling tool with a real-time, peer-to-peer feature for collaboration with your team. It provides a canvas to design and document business processes with your team, all directly within the browser.

This version is **serverless and collaborative**. Changes are synchronized in real-time between all users looking at the same model.

## What is Event Modeling?
Event Modeling is a method of describing a system by illustrating the information that changes within it over time. It focuses on a single, comprehensive diagram that captures Screen, Command, Internal Event, Read Model and External Event elements, providing a clear and complete blueprint for development.

## Key Features

- **Real-Time Collaboration**: Share your model's unique URL with colleagues to have them instantly join your session. All changes are synchronized in real-time across all participants.
- **Serverless & P2P**: Built with `gun.js`, this tool runs without a central server. Browsers communicate directly with each other to share data, ensuring privacy and simplicity.
- **Intelligent Canvas**: The canvas understands the rules of Event Modeling. It provides real-time visual feedback, highlighting valid and invalid connections as you model, guiding you toward a correct design.
- **Core Event Model Elements**: Add and connect essential components: Screen, Command, Internal Event, Read Model and External Event elements.
- **Import & Export**: Save your model to a local JSON file for backup, and import it back into any session to continue your work or overwrite a collaborative model.
- **Intuitive Interface**: Drag-and-drop nodes, create links easily, and edit properties in a dedicated panel.

## Why Weavr?

Unlike generic whiteboard tools (Miro, LucidChart) or enterprise modeling heavyweights, Weavr is purpose-built for **Domain-Driven Design**.

| Feature | Weavr | Generic Whiteboards | Enterprise Tools |
| :--- | :--- | :--- | :--- |
| **DDD Syntax** | **Enforced** (prevents invalid links) | None (draw anything) | Complex / Rigid |
| **Privacy** | **Local-First / P2P** (Your data) | Cloud (Their data) | Cloud / On-Prem |
| **Cost** | **Free & Open Source** | Subscription | Expensive |
| **Collaboration** | **Real-Time P2P** | Real-Time Cloud | Often Desktop / Slow |

## How to Use

1.  **Open the Application**: Simply navigate to the application's URL. You will be automatically placed in a new, unique model session.
2.  **Collaborate**:
    -   Click the **Share** button in the header. This copies the unique URL for your model to your clipboard.
    -   Send this link to your colleagues. When they open it, they will join you on the same canvas, and you will see each other's changes live.
3.  **Add Elements**: Use the floating `+` button in the bottom-right corner to add elements like `Screen`, `Command`, `Internal Event`, `Read Model` and `External Event` elements to the canvas.
4.  **Arrange the Canvas**:
    -   Click and drag elements to position them. The canvas uses a grid for easy alignment.
    -   Pan by clicking and dragging the canvas background.
    -   Zoom using your mouse wheel.
5.  **Create Relationships**:
    -   Hover over an element to reveal four connection handles.
    -   Click and drag from a handle to another element. The canvas will give you instant feedback: indicating potential target elements in **green** if the connection is valid according to Event Modeling rules, and **red** if it is not. Invalid links cannot be created.
6.  **Edit Properties**:
    -   **Single-click** an element or a link to select it and open the **Properties Panel** on the right. Here you can edit its name, description, and (for Triggers) its stereotype.
    -   **Double-click** an element or link to focus the input field in the panel for quick editing.
7.  **Save and Load**:
    -   Use the **Export** button to download the entire model as a `.json` file.
    -   Use the **Import** button to load a model from a `.json` file, replacing the current content of your canvas for all collaborators.

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `A` or `N` | Toggle the 'Add Element' toolbar |
| `1` - `5` | Add specific element (when toolbar is open) |
| `Arrow Keys` | Move selected element(s) |
| `Tab` | Cycle through elements on the canvas |
| `Shift` + `Tab` | Cycle backwards through elements |
| `Enter` | Open properties panel for selected element |
| `Esc` | Close properties panel / Deselect all |
| `Delete` / `Backspace` | Delete selected element(s) or link |

## Running Locally

This project uses Vite for a modern, fast development experience.

1.  **Clone the repository.**
    ```bash
    git clone https://github.com/rolfmadsen/weavr.git
    cd weavr
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3. **Choose NodeJS version**:
    ```bash
    nvm use 22
    ```
4.  **Run the development server**:
    ```bash
    npm run dev
    ```
5. **Build the application**
    ```bash
    npm run build
    ```
6. **Run the test suite**
    ```bash
    npm test
    ```

## Configuration

### Analytics (Optional)

This project uses [TelemetryDeck](https://telemetrydeck.com/) for privacy-first analytics.

To enable analytics, create a `.env` file in the root directory (or set the environment variable in your deployment platform) with your App ID:

```env
VITE_TELEMETRYDECK_APP_ID=your-app-id-here
```

If this variable is missing, analytics will be automatically disabled, and the application will function normally. Use this for local development or testing.