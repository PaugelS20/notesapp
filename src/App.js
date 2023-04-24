import "./App.css";
import { useEffect, useReducer } from "react";
import { API } from "aws-amplify";
import { List, Input, Button, Divider } from "antd";
import { listNotes } from "./graphql/queries";
import { v4 as uuid } from "uuid";
import {
	onCreateNote,
	onUpdateNote,
	onDeleteNote,
} from "./graphql/subscriptions";
import {
	createNote as CreateNote,
	deleteNote as DeleteNote,
	updateNote as UpdateNote,
} from "./graphql/mutations";

const CLIENT_ID = uuid();

const initialState = {
	notes: [],
	loading: true,
	error: false,
	form: { name: "", description: "" },
	// exclamationClicked: false,
};

const reducer = (state, action) => {
	const notes = [...state.notes];
	const index = notes.findIndex((n) => n.id === action.id);

	switch (action.type) {
		case "SET_NOTES":
			return { ...state, notes: action.notes, loading: false };

		case "ADD_NOTE":
			return { ...state, notes: [action.note, ...state.notes] };

		case "RESET_FORM":
			return { ...state, form: initialState.form };

		case "SET_INPUT":
			return {
				...state,
				form: { ...state.form, [action.name]: action.value },
			};

		case "UPDATE_NOTE":
			// const notes = [...state.notes];
			// const index = notes.findIndex((n) => n.id == action.id);
			if (CLIENT_ID === index.clientId) return;
			notes[index].completed = !notes.completed;
			return { ...state, notes, note: action.item };

		case "ADD_EXCLAMATION":
			return {
				...state,
				notes: action.notes,
				loading: false,
				important: true,
			};

		case "EXCLIMATION_NOTE":
			// const noteS = [...state.notes];
			// const x = noteS.findIndex((n) => n.id == action.id);
			// if (CLIENT_ID === index.clientId) return;
			// notes[index].name = !notes.name;
			return { ...state, notes: action.notes, loading: false };

		case "DELETE_NOTE":
			const i = state.notes.findIndex((n) => n.id === action.id);

			const newNotes = [
				...state.notes.slice(0, i),
				...state.notes.slice(i + 1),
			];
			return { ...state, notes: newNotes };

		case "ERROR":
			return { ...state, loading: false, error: true };

		default:
			return { ...state };
	}
};

const App = () => {
	const [state, dispatch] = useReducer(reducer, initialState);

	const fetchNotes = async () => {
		try {
			const notesData = await API.graphql({
				query: listNotes,
			});
			dispatch({
				type: "SET_NOTES",
				notes: notesData.data.listNotes.items,
			});
		} catch (err) {
			console.error(err);
			dispatch({ type: "ERROR" });
		}
	};

	const createNote = async () => {
		const { form } = state; // destructuring - form element out of state
		if (!form.name || !form.description) {
			return alert("please enter a name and description");
		}
		const note = {
			...form,
			clientId: CLIENT_ID,
			completed: false,
			id: uuid(),
		};
		// state.map(x.note = note.completed);
		dispatch({ type: "ADD_NOTE", note });
		dispatch({ type: "RESET_FORM" });
		try {
			await API.graphql({
				query: CreateNote,
				variables: { input: note },
			});
			console.log("successfully created note!");
		} catch (err) {
			console.error(err);
		}
	};

	const deleteNote = async ({ id }) => {
		const index = state.notes.findIndex((n) => n.id === id);
		const notes = [
			...state.notes.slice(0, index), // TODO add a filter
			...state.notes.slice(index + 1),
			// ...state.notes.filter((n) => n.completed).length
		];
		dispatch({ type: "SET_NOTES", notes });
		try {
			await API.graphql({
				query: DeleteNote,
				variables: { input: { id } },
			});
			console.log("successfully deleted note!");
		} catch (err) {
			console.error(err);
		}
	};

	const updateNote = async (note) => {
		const index = state.notes.findIndex((n) => n.id === note.id);
		const notes = [...state.notes];
		notes[index].completed = !note.completed;
		dispatch({ type: "SET_NOTES", notes });
		try {
			await API.graphql({
				query: UpdateNote,
				variables: {
					input: {
						id: note.id,
						completed: notes[index].completed,
					},
				},
			});
			console.log("note successfully updated!");
		} catch (err) {
			console.error(err);
		}
	};

	// adding ! to note
	const excitingNote = async (item) => {
		const notes = [...state.notes];
		const index = notes.findIndex((n) => n.id === item.id);
		const excitingNote = {
			name: item.name + "!",
			description: item.description,
		};
		notes[index] = excitingNote;
		dispatch({ type: "EXCLIMATION_NOTE", notes });
	};

	const completedNotes = state.notes.filter((n) => n.completed).length;
	const totalNotes = state.notes.length;

	const onChange = (e) => {
		dispatch({
			type: "SET_INPUT",
			name: e.target.name,
			value: e.target.value,
		});
	};

	useEffect(() => {
		fetchNotes();

		const createSubscription = API.graphql({
			query: onCreateNote,
		}).subscribe({
			next: (noteData) => {
				const note = noteData.value.data.onCreateNote;
				if (CLIENT_ID === note.clientId) return;
				dispatch({ type: "ADD_NOTE", note });
			},
		});

		const updateSubscription = API.graphql({
			query: onUpdateNote,
		}).subscribe({
			next: (noteData) => {
				const note = noteData.value.data.onUpdateNote.id;
				dispatch({ type: "UPDATE_NOTE", id: note });
			},
		});

		const updateExclimationSubscription = API.graphql({
			query: onUpdateNote,
		}).subscribe({
			next: (noteData) => {
				const note = noteData.value.data.onUpdateNote.name;
				console.log(note);
				dispatch({ type: "SET_NOTES", name: note.name });
			},
		});

		const deleteSubscription = API.graphql({
			query: onDeleteNote,
		}).subscribe({
			next: (noteData) => {
				const noteId = noteData.value.data.onDeleteNote.id;
				dispatch({ type: "DELETE_NOTE", id: noteId });
			},
		});

		return () => {
			createSubscription.unsubscribe();
			updateSubscription.unsubscribe();
			deleteSubscription.unsubscribe();
			updateExclimationSubscription.unsubscribe();
		};
	}, []);

	const styles = {
		container: { padding: 20 },
		input: { marginBottom: 10 },
		item: { textAlign: "left" },
	};

	const renderItem = (item) => {
		return (
			<List.Item
				style={styles.item}
				actions={[
					<>
						<Button
							danger
							type="link"
							onClick={() => deleteNote(item)}>
							Delete
						</Button>

						<Button
							id="CompleteButton"
							type="link"
							onClick={() => updateNote(item)}>
							{item.completed
								? "mark incompleted"
								: "mark complete"}
						</Button>

						<Button type="link" onClick={() => excitingNote(item)}>
							+!
						</Button>
					</>,
				]}>
				<List.Item.Meta
					title={item.name}
					description={item.description}
				/>
			</List.Item>
		);
	};

	return (
		<div style={styles.container}>
			<Input
				onChange={onChange}
				value={state.form.name}
				placeholder="Note Name"
				name="name"
				style={styles.input}
			/>
			<Input
				onChange={onChange}
				value={state.form.description}
				placeholder="Note description"
				name="description"
				style={styles.input}
			/>
			<Button onClick={createNote} type="primary">
				Create Note
			</Button>

			<Divider>
				{completedNotes} completed
				<Divider type="vertical" />
				{totalNotes} total
			</Divider>

			<List
				loading={state.loading}
				dataSource={state.notes}
				renderItem={renderItem}
			/>
		</div>
	);
};
export default App;
