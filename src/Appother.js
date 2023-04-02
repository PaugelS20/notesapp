import "./App.css";
import { useEffect, useReducer } from "react";
import { API } from "aws-amplify";
import { listNotes } from "./graphql/queries";
import { v4 as uuid } from "uuid";
import { List, Input, Button, Divider } from "antd";
import { onCreateNote } from "./graphql/subscriptions";
import {
	createNote as CreateNote,
	deleteNote as DeleteNote,
	updateNote as UpdateNote,
} from "./graphql/mutations";

const CLIENT_ID = uuid();

// set initial state
const initialState = {
	notes: [],
	loading: true,
	error: false,
	form: { name: "", description: "" },
	exclamationClicked: false,
};

const reducer = (state, action) => {
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

	// create note
	const createNote = async () => {
		const { form } = state;
		if (!form.name || !form.description) {
			return alert("please enter a name and description");
		}
		const note = {
			...form,
			clientId: CLIENT_ID,
			completed: false,
			id: uuid(),
		};
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

	// delete note
	const deleteNote = async ({ id }) => {
		const index = state.notes.findIndex((n) => n.id === id);
		const notes = [
			...state.notes.slice(0, index),
			...state.notes.slice(index + 1),
		];
		dispatch({ type: "SET_NOTES", notes });
		try {
			await API.graphql({
				query: DeleteNote,
				variables: { input: { id } },
			});
			console.log("successfully deleted note!");
		} catch (err) {
			console.error({ err });
		}
	};

	// update note
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
    
    const onAddExclamationClick = () => {
        const notes = [...state.notes];
        const index = notes.findIndex((n) => n.id === item.id);
        const updatedNote = { ...item, name: item.name + "!" };
        notes[index] = updatedNote;
        dispatch({ type: "SET_NOTES", notes });
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
			query: onCreateNote,
		}).subscribe({
			next: (noteData) => {
				const note = noteData.value.data.onCreateNote;
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

	const completed = state.notes.filter((n) => n.completed).length;
	const total = state.notes.length;

	// render items on page
	const renderItem = (item) => {

		return (
			<List.Item
				style={styles.item}
				actions={[
					<Button 
                        danger 
                        type="link" 
                        onClick={() => deleteNote(item)}>
						Delete
					</Button>,
					
                    <Button
							id="CompleteButton"
							type="link"
							onClick={() => updateNote(item)}>
							{item.completed
								? "mark incompleted"
								: "mark complete"}
					</Button>,
					
                    <Button onClick={onAddExclamationClick}>+!</Button>,
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
				{ completed } completed
				<Divider type="vertical" />
				{ total } total
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
