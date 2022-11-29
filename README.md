# Pizza Drone

Pizza Drone simulator that uses user geolocation data input to display optimal path for delivery. Implemented JQuery/AJAX for fetching location data to Flask API and temporarily storing it in Redis database using Redis-OM.

**Frontend in-progress**

## Features

* Implemented OpenStreetMap API
* Path finding animation

## Algorithmic challenge

Calculating the optimal path required a custom variation of the [Held–Karp algorithm](https://en.wikipedia.org/wiki/Held%E2%80%93Karp_algorithm) to solve the Traveling Salesman Problem.


```
# [Helper function to calculate path distance]
def tsp_path_helper(path, dist):
    return sum(dist[i][j] for i, j in zip(path, path[1:]))

# [Finding optimal path for drone]
def tsp_path(coords):
    dist_matrix = distance_matrix(coords)
    # Set of all nodes to visit
    to_visit = set(list(range(len(dist_matrix))))
    # Current state {(node, visited_nodes): shortest_path}
    state = {(i, frozenset([0, i])): [0, i]
             for i in list(range(1, len(dist_matrix[0])))}
    # print(state, '\n')
    for _ in list(range(len(dist_matrix) - 2)):
        next_state = {}
        for position, path in state.items():
            # print(position, path)
            current_node, visited = position
            # Check all nodes that haven't been visited so far
            for node in to_visit - visited:
                new_path = path + [node]
                new_pos = (node, frozenset(new_path))
                # Update if (current node, visited) is not in next state or we found shorter path
                if new_pos not in next_state \
                        or tsp_path_helper(new_path, dist_matrix) < tsp_path_helper(next_state[new_pos], dist_matrix):
                    next_state[new_pos] = new_path

        state = next_state
    # Find the shortest path and return to starting point
    shortest_path = min((path + [0] for path in state.values()))
    dist = tsp_path_helper(shortest_path, dist_matrix)
    return shortest_path, dist

```
