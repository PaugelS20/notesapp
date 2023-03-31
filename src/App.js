import "./App.css";
import { useEffect, useReducer } from "react";
import { API } from "aws-amplify";
import { List, Input, Button, Divider } from "antd";
import { listNotes } from "./graphql/queries";
import { v4 as uuid } from "uuid";
import { onCreateNote, onUpdateNote } from "./graphql/subscriptions";
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
};

const reducer = (state, action) => {
	switch (action.type) {
		// case "ADD_EXCLAMATION":
		// 	return { ...state, notes: action.notes[note].filter(x.note == completed) };
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
		}
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
			console.error("error: ", err);
		}
	};

	const deleteNote = async ({ id }) => {
		const index = state.notes.findIndex((n) => n.id === id);
		const notes = [
			...state.notes.slice(0, index), // TODO add a filter
			...state.notes.slice(index + 1),
		]; //.filter(notes => notes[index].completed = notes.completed).map(notes)
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
		// console.log(notes);
		notes[index].completed = !note.completed;
		console.log(notes[index].completed);

		dispatch({ type: "SET_NOTES", notes });
		try {
			await API.graphql({
				query: UpdateNote,
				variables: {
					input: {
						id: note.id,
						completed: notes[index],
					},
				},
			});
			console.log("note successfully updated!");
		} catch (err) {
			console.error(err);
		}
	};

	const onChange = (e) => {
		dispatch({
			type: "SET_INPUT",
			name: e.target.name,
			value: e.target.value,
		});
	};

	useEffect(() => {
		fetchNotes();
		const subscription = API.graphql({
			query: onUpdateNote,
		}).subscribe({
			next: (noteData) => {
				const note = noteData.value.data.onUpdateNote;
				console.log(noteData);
				if (CLIENT_ID === note.completed) return; //<p>{noteData.value.data.note}</p>;
				console.log(CLIENT_ID);
				dispatch({ type: "COMPLETE_NOTES", note });
			},
		});
		return () => subscription.unsubscribe();
	}, []);

	useEffect(() => {
		fetchNotes();
		const subscription = API.graphql({
			query: onCreateNote,
		}).subscribe({
			next: (noteData) => {
				const note = noteData.value.data.onCreateNote;
				console.log(noteData);
				if (CLIENT_ID === note.clientId) return;
				dispatch({ type: "ADD_NOTE", note });
			},
		});
		return () => subscription.unsubscribe();
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
						{/* <p style={styles.p} onClick={() => deleteNote(item)}>
							Delete
						</p> */}

						<Button
							id="CompleteButton"
							type="link"
							onClick={() => updateNote(item)}>
							{item.completed
								? "mark incompleted"
								: "mark complete"}
						</Button>

						<Button 
							type="link" 
							onClick={() => updateNote(item)}
						>
							{item.completed ? "-!" : "+!"}
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
				{ } completed
				<Divider type="vertical" />
				{updateNote} total
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
