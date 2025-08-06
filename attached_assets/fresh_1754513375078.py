from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from langchain.tools import Tool
import os
import json
import requests
from dotenv import load_dotenv
from typing import List, Dict

load_dotenv()
client = ChatOpenAI(api_key=os.getenv("OPENAI_API_KEY"), model="gpt-4", temperature=0.7)
WALMART_CLIENT_ID = os.getenv("WALMART_CLIENT_ID")
WALMART_CLIENT_SECRET = os.getenv("WALMART_CLIENT_SECRET")

def get_walmart_access_token() -> str:
    """
    Obtain Walmart API access token using client credentials.
    Returns:
        Access token string.
    """
    url = "https://marketplace.walmartapis.com/v3/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "client_credentials",
        "client_id": WALMART_CLIENT_ID,
        "client_secret": WALMART_CLIENT_SECRET
    }
    response = requests.post(url, headers=headers, data=data)
    response.raise_for_status()
    return response.json().get("access_token")

def search_walmart_products(query: str) -> List[Dict]:
    """
    Search Walmart for products matching the query.
    Args:
        query: Search term (e.g., "tomatoes").
    Returns:
        List of product dictionaries with name, itemId, and URL.
    """
    access_token = get_walmart_access_token()
    url = "https://marketplace.walmartapis.com/v3/items"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "WM_QOS.CORRELATION_ID": "1234567890",
        "WM_SVC.NAME": "Walmart Marketplace"
    }
    params = {"query": query}
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    items = response.json().get("items", [])
    return [
        {"name": item.get("name"), "itemId": item.get("itemId"), "url": item.get("productUrl")}
        for item in items[:1]  # Limit to top result for simplicity
    ]

def add_to_walmart_cart(item_id: str) -> Dict:
    """
    Simulate adding an item to Walmart cart (actual implementation requires user session).
    Args:
        item_id: Walmart product item ID.
    Returns:
        Dictionary with item details and cart status.
    """
    # Note: Direct cart addition requires user authentication or API2Cart integration.
    # This simulates the process by returning a cart addition message.
    return {"item_id": item_id, "status": "Simulated addition to cart", "cart_url": "https://www.walmart.com/cart"}

# Define Walmart tool for LangChain
walmart_tool = Tool(
    name="WalmartCartTool",
    func=lambda query: search_walmart_products(query),
    description="Searches Walmart.com for products and returns product details."
)

def initialize_vector_store():
    """
    Fetch recipes from websites, create embeddings, and store in Chroma.
    Returns a vector store for retrieval.
    """
    urls = [
        "https://www.allrecipes.com/recipes/",
        "https://www.bbcgoodfood.com/recipes",
    ]
    loader = WebBaseLoader(urls)
    documents = loader.load()
    text_splitter = Recursive---------------------CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    from langchain_community.embeddings import HuggingFaceEmbeddings
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vector_store = Chroma.from_documents(chunks, embeddings)
    return vector_store

def generate_recipes(num_people: int, ingredients: str, dietary: str) -> Dict:
    """
    Generate 3–5 recipes using RAG and add missing ingredients to Walmart cart.
    Args:
        num_people: Number of people.
        ingredients: Ingredients available (comma-separated).
        dietary: Dietary restrictions.
    Returns:
        Dictionary with recipes and cart additions.
    """
    # Initialize vector store
    vector_store = initialize_vector_store()
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    # Split user ingredients
    user_ingredients = [ing.strip().lower() for ing in ingredients.split(",")]

    # Define prompt template
    prompt_template = PromptTemplate(
        input_variables=["context", "num_people", "ingredients", "dietary"],
        template="""
You are a professional chef. Using the provided web recipe context, create 3–5 unique recipes for {num_people} people using these ingredients: {ingredients}.
Ensure they adhere to these dietary restrictions: {dietary}.
For each recipe, include a list of any additional ingredients not provided by the user.
Return your answer as a JSON array where each item is an object with these keys:
"title" (string),
"ingredients" (list of strings),
"instructions" (list of step-by-step instructions),
"missing_ingredients" (list of strings, additional ingredients not in user input).
Only output valid JSON. Do not include any extra text.

Web recipe context:
{context}
"""
    )

    # Create RAG chain
    rag_chain = (
        {
            "context": retriever,
            "num_people": RunnablePassthrough(),
            "ingredients": RunnablePassthrough(),
            "dietary": RunnablePassthrough()
        }
        | prompt_template
        | client
        | StrOutputParser()
    )

    # Run RAG chain
    query = f"Recipes using {ingredients} for {dietary} diet"
    response = rag_chain.invoke({
        "num_people": num_people,
        "ingredients": ingredients,
        "dietary": dietary,
        "query": query
    })

    # Parse recipes
    try:
        recipes =