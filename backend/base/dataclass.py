import json
from dataclasses import dataclass, asdict, is_dataclass, fields
from typing import Any, Dict, List, Type, TypeVar, Union, Optional, get_origin, get_args
from langchain_core.documents import Document

T = TypeVar("T", bound="SerializableDataClass")


@dataclass
class SerializableDataClass:
    """
    A base dataclass that provides methods for easy serialization and deserialization.

    Inherit from this class to automatically gain the ability to convert your
    dataclasses to and from dictionaries and JSON strings, including support
    for nested dataclasses and lists of dataclasses.
    """

    @classmethod
    def from_dict(cls: Type[T], data: Dict[str, Any]) -> T:
        """
        Constructs a dataclass instance from a dictionary.

        This method recursively converts nested dictionaries into instances of their
        corresponding dataclass types and handles lists of dataclass objects.

        Args:
            data: A dictionary containing the data to populate the dataclass fields.

        Returns:
            An instance of the dataclass populated with data from the dictionary.

        Raises:
            TypeError: If the input 'data' is not a dictionary.
        """
        if not isinstance(data, dict):
            raise TypeError(f"Input must be a dictionary, but got {type(data).__name__}")

        init_kwargs: Dict[str, Any] = {}
        for f in fields(cls):
            if f.name in data:
                field_value = data[f.name]
                field_type = f.type

                origin_type = get_origin(field_type)
                
                # Handle lists of dataclasses
                if origin_type in (list, List) and is_dataclass(get_args(field_type)[0]):
                    inner_type = get_args(field_type)[0]
                    init_kwargs[f.name] = [inner_type.from_dict(item) for item in field_value]
                # Handle nested single dataclass
                elif is_dataclass(field_type):
                    init_kwargs[f.name] = field_type.from_dict(field_value)
                # Handle primitive types
                else:
                    init_kwargs[f.name] = field_value
        
        return cls(**init_kwargs)

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the dataclass instance to a dictionary.

        This method uses the `asdict` utility from the `dataclasses` module,
        which recursively converts the entire structure, including nested objects.

        Returns:
            A dictionary representation of the dataclass instance.
        """
        return asdict(self)

    @classmethod
    def from_json(cls: Type[T], json_str: str) -> Union[T, List[T]]:
        """
        Constructs a dataclass instance or a list of instances from a JSON string.

        This method acts as a smart constructor that can handle both a single
        JSON object and a JSON array of objects.

        Args:
            json_str: The JSON string to parse.

        Returns:
            A new instance of the class if the JSON string is an object, or a
            list of instances if the JSON string is an array.
        """
        data = json.loads(json_str)
        if isinstance(data, list):
            return [cls.from_dict(item) for item in data]
        else:
            return cls.from_dict(data)

    def to_json(self, indent: int = 4) -> str:
        """
        Converts the dataclass instance to a JSON formatted string.

        Args:
            indent: The number of spaces to use for indentation in the JSON output.
                    Defaults to 4 for readability.

        Returns:
            A JSON string representation of the dataclass instance.
        """
        return json.dumps(self.to_dict(), indent=indent)


# --- Example Usage ---

@dataclass
class Course(SerializableDataClass):
    """
    An example dataclass representing a single course.
    It inherits from SerializableDataClass to gain conversion capabilities.
    """
    title: str
    author: str


@dataclass
class LearningPath(SerializableDataClass):
    """
    An example dataclass representing a learning path composed of multiple courses.
    This demonstrates how nested dataclasses and lists are handled.
    """
    path_name: str
    description: str
    courses: List[Course]



@dataclass
class SearchResult:
    title: str
    link: str
    snippet: Optional[str] = None
    content: Optional[str] = None
    document: Optional[Document] = None